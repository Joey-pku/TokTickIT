import { useState } from "react";
import { useRequester } from "./RequesterContext.js";
import { ShieldIcon, UserIcon } from "./Icons.js";

export function RequesterSelector() {
  const { requesters, state, retry, select } = useRequester();
  const [choice, setChoice] = useState("");
  const valid = state === "ready" && requesters.some(item => String(item.id) === choice);
  return <section className="requester-card" aria-labelledby="requester-title">
    <div className="requester-glyph"><UserIcon size={32} /></div>
    <h1 id="requester-title">Select Development Requester</h1>
    <p className="zen-alert zen-info">Select a Development Requester to test requester-specific ticket behavior. This is not a login screen. Authentication and role-based access will be introduced in Lab 3.</p>
    {state === "loading" && <div role="status" className="requester-loading"><span className="zen-spinner" aria-hidden="true" />Loading active development requesters...</div>}
    {state === "error" && <div role="alert" className="zen-alert zen-error">
      <p>Unable to load Development Requesters. Please try again.</p>
      <button className="zen-button zen-secondary" onClick={retry}>Retry</button>
    </div>}
    {state === "ready" && requesters.length === 0 && <p role="status" className="zen-alert">No active Development Requesters are available. Please contact the development team.</p>}
    <form onSubmit={event => { event.preventDefault(); if (valid) select(Number(choice)); }}>
      <label htmlFor="development-requester">Development Requester <span className="required-marker">*</span></label>
      <select id="development-requester" aria-required="true" aria-describedby="requester-help" value={choice} onChange={event => setChoice(event.target.value)} disabled={state !== "ready" || requesters.length === 0}>
        <option value="">-- Select an Active Requester --</option>
        {requesters.map(item => <option key={item.id} value={item.id}>{item.name} ({item.department})</option>)}
      </select>
      <p id="requester-help" className="zen-helper">Only active development requesters are shown.</p>
      <p className="zen-alert zen-notice"><ShieldIcon /> Authentication coming in Lab 3. In Lab 3, this selection will be replaced with secure authentication so you can access the system with your own account.</p>
      <div className="requester-actions">
        <button type="button" className="zen-button zen-secondary" onClick={() => setChoice("")}>Cancel</button>
        <button type="submit" className="zen-button zen-primary" disabled={!valid}>Continue <span aria-hidden="true">→</span></button>
      </div>
    </form>
  </section>;
}
