import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from zipfile import ZipFile
from populator.control_centre import HubService


class ControlCentreTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'data').mkdir()
        for name, value in [('schema_version', {'schema_version':'2.0','application_version':'0.4.0'}), ('data_version', {'data_version':'0.4.0'})]:
            (self.root / 'data' / (name + '.json')).write_text(json.dumps(value))
        (self.root / 'package.json').write_text('{"version":"0.4.0"}')
        self.hub = HubService(self.root)

    def test_empty_snapshot_has_no_fabricated_history_or_health(self):
        with patch('populator.control_centre.leaf_coverage', return_value=[]):
            value = self.hub.snapshot()
        self.assertEqual(value['entries'], 0)
        self.assertIsNone(value['audit'])
        self.assertEqual(value['activity'], [])
        self.assertEqual(value['backups'], [])

    def test_backup_uses_existing_utility_and_does_not_overwrite(self):
        path = self.root / 'data' / 'test.json'
        path.write_text('[]')
        first = self.hub.action('backup')
        second = self.hub.action('backup')
        self.assertNotEqual(first['name'], second['name'])
        self.assertEqual(path.read_text(), '[]')
        with ZipFile(self.root / 'backups' / first['name']) as archive:
            self.assertIn('data/test.json', archive.namelist())
        self.assertEqual(len(self.hub.backups()), 2)

    def test_audit_is_sourced_from_scanner_and_persisted(self):
        audit = {'summary': {'errors':1,'warnings':2,'info':3},'findings':[]}
        with patch('populator.control_centre.scan_health', return_value=audit) as scan:
            result = self.hub.action('audit')
        scan.assert_called_once_with(self.root / 'data')
        self.assertEqual(result['summary'], audit['summary'])
        self.assertEqual(self.hub.read()['audit'], result)
        self.assertEqual(self.hub.read()['activity'][0]['type'],'diagnostics')

    def test_failed_action_does_not_claim_success(self):
        with patch('populator.control_centre.create_backup', side_effect=OSError('disk full')):
            with self.assertRaisesRegex(OSError, 'disk full'):
                self.hub.action('backup')
        self.assertEqual(self.hub.read(), {})
        with self.assertRaises(ValueError):
            self.hub.action('restore')

class ControlCentreHttpTests(unittest.TestCase):
    def test_http_routes_and_origin_safeguard(self):
        import threading
        from http.client import HTTPConnection
        from http.server import ThreadingHTTPServer
        from start import StudioHandler
        with patch('start.SERVICE') as service:
            service.snapshot.return_value = {'entries':17}
            service.action.return_value = {'name':'backup.zip'}
            server = ThreadingHTTPServer(('127.0.0.1',0), StudioHandler)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            self.addCleanup(server.server_close)
            self.addCleanup(server.shutdown)
            conn = HTTPConnection('127.0.0.1',server.server_port)
            self.addCleanup(conn.close)
            conn.request('GET','/api/hub')
            response=conn.getresponse()
            self.assertEqual(response.status,200)
            self.assertEqual(json.loads(response.read())['entries'],17)
            conn.request('POST','/api/hub/backup',headers={'Origin':'http://evil.test','X-Forge-Action':'1'})
            response=conn.getresponse(); response.read()
            self.assertEqual(response.status,403)
            service.action.assert_not_called()
            conn.request('POST','/api/hub/backup',headers={'Origin':f'http://127.0.0.1:{server.server_port}','X-Forge-Action':'1'})
            response=conn.getresponse(); response.read()
            self.assertEqual(response.status,200)
            service.action.assert_called_once_with('backup')
            service.snapshot.side_effect = OSError('unavailable')
            conn.request('GET','/api/hub')
            response=conn.getresponse()
            self.assertEqual(response.status,500)
            self.assertEqual(json.loads(response.read())['error'],'unavailable')

class CatalogueActivityTests(unittest.TestCase):
    def test_first_observation_does_not_invent_history(self):
        from populator.hub_activity import catalogue_changes
        self.assertEqual(catalogue_changes(None, {'core/settings':{'count':3,'hash':'a'}}, 'now'), [])

    def test_expansion_edits_and_removal_are_derived(self):
        from populator.hub_activity import catalogue_changes
        previous={'a':{'count':3,'hash':'a'},'b':{'count':2,'hash':'b'},'c':{'count':1,'hash':'c'}}
        current={'a':{'count':7,'hash':'aa'},'b':{'count':2,'hash':'bb'}}
        events=catalogue_changes(previous,current,'now')
        self.assertEqual([e['delta'] for e in events],[4,0,-1])
        self.assertTrue(all(e['observation'] for e in events))
        self.assertEqual(catalogue_changes(current,current,'later'),[])
