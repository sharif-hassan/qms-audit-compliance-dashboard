const XLSX = require("../node_modules/xlsx");
const path = require("path");

// ── File 1: Hierarchical style — NIST CSF ────────────────────────────────────
const wb1 = XLSX.utils.book_new();
const rows1 = [
  ["Clause No.", "Clause", "Audit Question", "Std", "Cycle", "Evidence", "Responsible Party"],

  ["ID", "IDENTIFY", "", "", "", "", ""],
  ["ID.AM", "Asset Management", "", "", "", "", ""],
  ["ID.AM-1", "Asset Inventory", "Are physical devices and systems within the organization inventoried?", "NIST CSF", "Annual", "", "IT Director"],
  ["ID.AM-2", "Software Inventory", "Are software platforms and applications within the organization inventoried?", "NIST CSF", "Annual", "", "IT Director"],
  ["ID.AM-3", "Data Flows", "Are organizational communication and data flows mapped?", "NIST CSF", "Annual", "", "IT Director"],
  ["ID.BE", "Business Environment", "", "", "", "", ""],
  ["ID.BE-1", "Supply Chain Role", "Is the organization's role in the supply chain identified and communicated?", "NIST CSF", "Annual", "", "VP Operations"],
  ["ID.BE-2", "Critical Services", "Is the organization's place in critical infrastructure identified and communicated?", "NIST CSF", "Annual", "", "VP Operations"],
  ["ID.GV", "Governance", "", "", "", "", ""],
  ["ID.GV-1", "Security Policy", "Is an information security policy established and communicated?", "NIST CSF", "Annual", "", "CISO"],
  ["ID.GV-2", "Roles & Responsibilities", "Are information security roles and responsibilities coordinated with internal and external partners?", "NIST CSF", "Annual", "", "CISO"],
  ["ID.GV-3", "Legal Requirements", "Are legal and regulatory requirements regarding cybersecurity understood and managed?", "NIST CSF", "Annual", "", "Legal Counsel"],
  ["ID.RA", "Risk Assessment", "", "", "", "", ""],
  ["ID.RA-1", "Asset Vulnerabilities", "Are asset vulnerabilities identified and documented?", "NIST CSF", "Biannual", "", "Risk Manager"],
  ["ID.RA-2", "Threat Intelligence", "Is cyber threat intelligence received from information sharing forums and sources?", "NIST CSF", "Quarterly", "", "Risk Manager"],
  ["ID.RA-3", "Threat Identification", "Are threats, both internal and external, identified and documented?", "NIST CSF", "Biannual", "", "Risk Manager"],

  ["PR", "PROTECT", "", "", "", "", ""],
  ["PR.AC", "Identity Management & Access Control", "", "", "", "", ""],
  ["PR.AC-1", "Identity Management", "Are identities and credentials issued, managed, verified, revoked, and audited for authorized devices and users?", "NIST CSF", "Annual", "", "IT Director"],
  ["PR.AC-2", "Physical Access", "Is physical access to assets managed and protected?", "NIST CSF", "Annual", "", "Facilities Manager"],
  ["PR.AC-3", "Remote Access", "Is remote access managed?", "NIST CSF", "Annual", "", "IT Director"],
  ["PR.DS", "Data Security", "", "", "", "", ""],
  ["PR.DS-1", "Data at Rest", "Is data-at-rest protected?", "NIST CSF", "Annual", "", "IT Director"],
  ["PR.DS-2", "Data in Transit", "Is data-in-transit protected?", "NIST CSF", "Annual", "", "IT Director"],
  ["PR.DS-3", "Asset Disposition", "Are assets formally managed throughout removal, transfers, and disposition?", "NIST CSF", "Annual", "", "IT Director"],
  ["PR.IP", "Information Protection Processes", "", "", "", "", ""],
  ["PR.IP-1", "Baseline Configuration", "Is a baseline configuration of IT/OT systems created and maintained?", "NIST CSF", "Annual", "", "IT Director"],
  ["PR.IP-2", "System Development", "Is a system development life cycle to manage systems implemented?", "NIST CSF", "Annual", "", "VP Engineering"],
  ["PR.IP-3", "Change Control", "Are configuration change control processes in place?", "NIST CSF", "Annual", "", "VP Engineering"],

  ["DE", "DETECT", "", "", "", "", ""],
  ["DE.AE", "Anomalies & Events", "", "", "", "", ""],
  ["DE.AE-1", "Network Baseline", "Is a baseline of network operations and expected data flows established?", "NIST CSF", "Annual", "", "IT Director"],
  ["DE.AE-2", "Event Analysis", "Are detected events analyzed to understand attack targets and methods?", "NIST CSF", "Annual", "", "Security Analyst"],
  ["DE.CM", "Security Continuous Monitoring", "", "", "", "", ""],
  ["DE.CM-1", "Network Monitoring", "Is the network monitored to detect potential cybersecurity events?", "NIST CSF", "Ongoing", "", "Security Analyst"],
  ["DE.CM-2", "Physical Environment", "Is the physical environment monitored to detect potential cybersecurity events?", "NIST CSF", "Ongoing", "", "Facilities Manager"],
  ["DE.CM-3", "Personnel Activity", "Is personnel activity monitored to detect potential cybersecurity events?", "NIST CSF", "Annual", "", "HR Director"],

  ["RS", "RESPOND", "", "", "", "", ""],
  ["RS.RP", "Response Planning", "", "", "", "", ""],
  ["RS.RP-1", "Response Plan", "Is a response plan executed during or after an incident?", "NIST CSF", "Annual", "", "CISO"],
  ["RS.CO", "Communications", "", "", "", "", ""],
  ["RS.CO-1", "Personnel Roles", "Are personnel aware of their roles and order of operations when a response is needed?", "NIST CSF", "Annual", "", "CISO"],
  ["RS.CO-2", "Incident Reporting", "Are incidents reported consistent with established criteria?", "NIST CSF", "Annual", "", "CISO"],

  ["RC", "RECOVER", "", "", "", "", ""],
  ["RC.RP", "Recovery Planning", "", "", "", "", ""],
  ["RC.RP-1", "Recovery Plan", "Is a recovery plan executed during or after a cybersecurity incident?", "NIST CSF", "Annual", "", "VP Operations"],
  ["RC.IM", "Improvements", "", "", "", "", ""],
  ["RC.IM-1", "Recovery Lessons", "Are recovery plans updated to incorporate lessons learned?", "NIST CSF", "Annual", "", "VP Operations"],
  ["RC.IM-2", "Recovery Strategy", "Are recovery strategies updated based on lessons learned?", "NIST CSF", "Annual", "", "VP Operations"],
];

const ws1 = XLSX.utils.aoa_to_sheet(rows1);
ws1["!cols"] = [{ wch: 12 }, { wch: 40 }, { wch: 70 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 20 }];
XLSX.utils.book_append_sheet(wb1, ws1, "NIST CSF");
XLSX.writeFile(wb1, path.join(__dirname, "../docs/test-nist-csf-upload.xlsx"));
console.log("Created docs/test-nist-csf-upload.xlsx");

// ── File 2: Flat ISO 27001-style — GDPR ──────────────────────────────────────
const wb2 = XLSX.utils.book_new();
const rows2 = [
  ["Standard", "Control", "Description", "Description", "Evaluator Notes", "Responsible Party"],

  ["Art. 5(1)(a)",  "Lawfulness & Transparency",  "Lawfulness of Processing",                "Verify that personal data is processed lawfully, fairly, and in a transparent manner in relation to data subjects.", "", "DPO"],
  ["Art. 5(1)(b)",  "Lawfulness & Transparency",  "Purpose Limitation",                      "Confirm that personal data is collected for specified, explicit, and legitimate purposes and not further processed incompatibly.", "", "DPO"],
  ["Art. 5(1)(c)",  "Lawfulness & Transparency",  "Data Minimisation",                       "Check that personal data collected is adequate, relevant, and limited to what is necessary in relation to the purposes of processing.", "", "DPO"],
  ["Art. 5(1)(d)",  "Lawfulness & Transparency",  "Accuracy",                                "Ensure personal data is accurate and, where necessary, kept up to date; inaccurate data must be erased or rectified.", "", "DPO"],
  ["Art. 5(1)(e)",  "Lawfulness & Transparency",  "Storage Limitation",                      "Verify that personal data is kept in a form that permits identification of data subjects for no longer than necessary.", "", "DPO"],

  ["Art. 13",       "Data Subject Rights",        "Information to be Provided (Direct)",     "Confirm that data subjects are provided with required information at the time their personal data is collected.", "", "DPO"],
  ["Art. 14",       "Data Subject Rights",        "Information to be Provided (Indirect)",   "Verify that required information is provided within one month where data is not obtained directly from the data subject.", "", "DPO"],
  ["Art. 15",       "Data Subject Rights",        "Right of Access",                         "Check that the organization responds to access requests, providing a copy of personal data and supplementary information within one month.", "", "DPO"],
  ["Art. 16",       "Data Subject Rights",        "Right to Rectification",                  "Ensure that inaccurate personal data can be rectified and incomplete data completed upon request without undue delay.", "", "DPO"],
  ["Art. 17",       "Data Subject Rights",        "Right to Erasure",                        "Verify that personal data can be erased upon request where one of the specified grounds applies.", "", "DPO"],
  ["Art. 20",       "Data Subject Rights",        "Right to Data Portability",               "Confirm that data subjects can receive their personal data in a structured, commonly used, machine-readable format.", "", "DPO"],

  ["Art. 24",       "Controller Obligations",     "Responsibility of the Controller",        "Verify that the controller has implemented appropriate technical and organisational measures to ensure processing is performed in accordance with the GDPR.", "", "DPO"],
  ["Art. 25",       "Controller Obligations",     "Data Protection by Design and Default",   "Check that data protection principles are integrated into processing activities by design and that only necessary data is processed by default.", "", "DPO"],
  ["Art. 28",       "Controller Obligations",     "Processor Agreements",                    "Confirm that processing by a processor is governed by a binding contract setting out the subject matter, duration, nature, and purpose of the processing.", "", "Legal Counsel"],
  ["Art. 30",       "Controller Obligations",     "Records of Processing Activities",        "Verify that records of processing activities under the controller's responsibility are maintained and available to supervisory authorities.", "", "DPO"],

  ["Art. 32",       "Security of Processing",     "Security Measures",                       "Confirm that appropriate technical and organisational measures are implemented to ensure a level of security appropriate to the risk.", "", "CISO"],
  ["Art. 33",       "Security of Processing",     "Breach Notification to Supervisory Auth", "Verify that personal data breaches are reported to the supervisory authority within 72 hours of becoming aware, where feasible.", "", "DPO"],
  ["Art. 34",       "Security of Processing",     "Breach Notification to Data Subjects",    "Check that data subjects are communicated personal data breaches without undue delay when it is likely to result in high risk.", "", "DPO"],
  ["Art. 35",       "Security of Processing",     "Data Protection Impact Assessment",       "Confirm that a DPIA is carried out prior to processing that is likely to result in a high risk to the rights and freedoms of natural persons.", "", "DPO"],

  ["Art. 37",       "Data Protection Officer",    "Designation of DPO",                      "Verify that a Data Protection Officer has been designated where required and their contact details published and communicated to supervisory authorities.", "", "CEO"],
  ["Art. 38",       "Data Protection Officer",    "Position of DPO",                         "Ensure the DPO is involved in all issues relating to the protection of personal data and provided with resources to carry out their tasks.", "", "CEO"],
  ["Art. 39",       "Data Protection Officer",    "Tasks of DPO",                            "Confirm the DPO performs all required tasks including informing staff, monitoring compliance, and acting as contact point for supervisory authorities.", "", "DPO"],
];

const ws2 = XLSX.utils.aoa_to_sheet(rows2);
ws2["!cols"] = [{ wch: 14 }, { wch: 26 }, { wch: 38 }, { wch: 70 }, { wch: 25 }, { wch: 16 }];
XLSX.utils.book_append_sheet(wb2, ws2, "GDPR Audit");
XLSX.writeFile(wb2, path.join(__dirname, "../docs/test-gdpr-upload.xlsx"));
console.log("Created docs/test-gdpr-upload.xlsx");
