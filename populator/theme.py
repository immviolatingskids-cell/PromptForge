"""Dependency-free terminal capability detection and consistent rendering."""
from __future__ import annotations
import os,shutil,sys
from dataclasses import dataclass
from typing import Any
SYMBOLS={"enhanced":{"healthy":"✓","good":"●","weak":"▲","critical":"!","warning":"⚠","error":"✕","target":"🎯","library":"📚","health":"♥","add":"➕","bulk":"📦","search":"🔎","backup":"💾","workshop":"⚒","arrow":"→"},"basic":{"healthy":"+","good":"o","weak":"^","critical":"!","warning":"!","error":"x","target":">","library":"#","health":"+","add":"+","bulk":"#","search":"?","backup":"=","workshop":"#","arrow":">"}}
def supports_unicode(stream:Any=sys.stdout)->bool:
    if os.environ.get("PERSONAFORGE_BASIC")=="1":return False
    try:"⚒✓🎯".encode(getattr(stream,"encoding",None) or "ascii");return True
    except (UnicodeEncodeError,LookupError):return False
@dataclass
class Theme:
    enhanced:bool=True;width:int|None=None
    def __post_init__(self)->None:self.width=max(40,min(self.width or shutil.get_terminal_size((72,24)).columns,100));self.symbol=SYMBOLS["enhanced" if self.enhanced else "basic"]
    @classmethod
    def detect(cls,stream:Any=sys.stdout,width:int|None=None)->"Theme":return cls(supports_unicode(stream),width)
    def rule(self,char:str|None=None)->str:return (char or ("─" if self.enhanced else "-"))*self.width
    def safe(self,value:Any)->str:
        text=str(value)
        if self.enhanced:return text
        replacements={"→":">","•":"-","–":"-","—":"-","’":"'","“":"\"","”":"\"","♥":"+","⚒":"#","✓":"+","⚠":"!","✕":"x","🎯":">","📚":"#","➕":"+","📦":"#","🔎":"?","💾":"="}
        for source,target in replacements.items():text=text.replace(source,target)
        return text.encode("ascii","replace").decode("ascii")
    def header(self,title:str,subtitle:str="")->str:
        if not self.enhanced:return f"{self.rule('=')}\n{title}\n{subtitle}\n{self.rule('=')}".replace("\n\n","\n")
        inner=self.width-4;lines=["╔"+"═"*(self.width-2)+"╗",f"║  {title[:inner]:<{inner}}║"]
        if subtitle:lines.append(f"║  {subtitle[:inner]:<{inner}}║")
        return "\n".join([*lines,"╚"+"═"*(self.width-2)+"╝"])
    def progress(self,value:int,target:int,cells:int=20)->str:
        filled=round(cells*min(1,value/target)) if target else cells;return f"[{'#'*filled}{'.'*(cells-filled)}] {value} / {target}"
    def table(self,headers:list[str],rows:list[list[Any]])->str:
        if not rows:return "No entries found."
        widths=[len(str(header)) for header in headers]
        for row in rows:
            for index,value in enumerate(row):widths[index]=min(max(widths[index],len(str(value))),max(10,self.width//len(headers)))
        line=lambda row:"  ".join(str(value)[:widths[i]].ljust(widths[i]) for i,value in enumerate(row)).rstrip()
        return "\n".join([line(headers),self.rule("-"),*(line(row) for row in rows)])
