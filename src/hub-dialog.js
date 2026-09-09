/** Accessible native dialogs work in browsers and the Codex embedded preview. */
export function askText(title, initial = "") { return showDialog(title, initial); }
export async function confirmAction(title) { return (await showDialog(title)) === true; }
function showDialog(title, initial) {
  return new Promise(resolve => {
    const previousFocus = document.activeElement;
    const dialog = document.createElement("dialog");
    dialog.className = "hub-dialog";
    const heading = document.createElement("h2");
    heading.id = "hub-dialog-title"; heading.textContent = title;
    dialog.setAttribute("aria-labelledby",heading.id);
    const form = document.createElement("form");
    const actions = document.createElement("div"); actions.className = "hub-actions";
    let input;
    if (initial !== undefined) {
      const label = document.createElement("label"); label.textContent = "Value";
      input = document.createElement("input"); input.value = initial; input.maxLength = 500; input.autofocus = true;
      label.append(input); form.append(label);
    }
    const cancel = document.createElement("button"); cancel.type = "button"; cancel.textContent = "Cancel";
    const submit = document.createElement("button"); submit.type = "submit"; submit.className = "primary"; submit.textContent = input ? "Save" : "Delete";
    if (!input) cancel.autofocus = true;
    actions.append(cancel,submit); form.append(actions); dialog.append(heading,form); document.body.append(dialog);
    let result = null;
    cancel.addEventListener("click",() => dialog.close());
    form.addEventListener("submit",event => {event.preventDefault(); result = input ? input.value : true; dialog.close();});
    dialog.addEventListener("close",() => { dialog.remove(); if (previousFocus?.isConnected) previousFocus.focus(); resolve(result); },{once:true});
    dialog.showModal();
    input?.select();
  });
}
