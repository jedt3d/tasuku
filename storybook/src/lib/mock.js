// Mock data for stories. Every person and Organization here is fictional.

export const staff = {
  owner: 'Somchai Prasert',
  nicha: 'Nicha Wong',
  kenji: 'Kenji Tanaka',
  master: 'Worajedt S.',
};

export const customer = { name: 'Dr. Ploy Suwan', email: 'ploy.s@lanna-medical.example' };

export const task = {
  id: '#1042',
  title: 'PACS server upgrade — Radiology',
  organization: 'Lanna Medical Group',
  due: '2026-10-18',
  refersTo: '#0987 PACS storage expansion',
  collaborators: [staff.nicha, staff.kenji],
  timeline: [
    { kind: 'event', icon: 'plus', actor: staff.owner, key: 'event.opened', at: '2026-10-12T09:14Z' },
    {
      kind: 'comment',
      author: staff.owner,
      role: 'owner',
      at: '2026-10-12T09:20Z',
      text: 'แผนอัปเกรด PACS แนบมาแล้วครับ ใช้เวลาประมาณ 4 ชั่วโมง ขอ downtime คืนวันเสาร์ที่ 17 ต.ค. หลัง 22:00 น.',
      files: [{ name: 'pacs-upgrade-plan.pdf', kind: 'pdf', size: '1.2 MB' }],
      // Threads hang off the entry they were started from.
      threads: [
        {
          title: 'Is the staging server ready?',
          status: 'settled',
          responsible: staff.kenji,
          more: 3,
          messages: [
            {
              author: staff.kenji,
              at: '2026-10-13T10:12Z',
              text: 'バックアップは完了しました。Staging has been on the new build since this morning.',
            },
            { author: staff.nicha, at: '2026-10-13T14:40Z', text: 'Verified — DICOM send and receive both pass.' },
          ],
        },
      ],
    },
    {
      kind: 'event',
      icon: 'activity',
      actor: 'Tasuku',
      key: 'event.movedTo',
      status: 'in_progress',
      at: '2026-10-12T09:20Z',
    },
    {
      kind: 'event',
      icon: 'userPlus',
      actor: staff.owner,
      key: 'event.addedCustomer',
      vars: { name: customer.name },
      at: '2026-10-12T09:31Z',
    },
    {
      kind: 'comment',
      author: customer.name,
      role: 'customer',
      at: '2026-10-12T11:02Z',
      text: 'รับทราบค่ะ คืนวันเสาร์สะดวก ขอแจ้งแผนกรังสีก่อนนะคะ แนบผังห้อง server มาให้ด้วยค่ะ',
      files: [{ name: 'server-room.webp', kind: 'image', size: '184 KB' }],
      threads: [
        {
          title: 'Site access permit for Saturday night',
          status: 'open',
          responsible: staff.nicha,
          messages: [
            {
              author: staff.nicha,
              at: '2026-10-14T09:05Z',
              text: 'ส่งแบบฟอร์มขอเข้าพื้นที่ไปแล้ว รออนุมัติจากฝ่ายอาคาร',
            },
          ],
        },
      ],
    },
    {
      kind: 'event',
      icon: 'users',
      actor: staff.owner,
      key: 'event.addedCollaborators',
      vars: { names: [staff.nicha, staff.kenji] },
      at: '2026-10-13T08:45Z',
    },
    {
      kind: 'comment',
      author: staff.nicha,
      role: 'collaborator',
      at: '2026-10-14T16:30Z',
      edited: true,
      text: 'Access for three engineers is confirmed with building security from 21:30.',
    },
    { kind: 'deleted', icon: 'trash', at: '2026-10-14T16:48Z' },
    {
      kind: 'comment',
      author: customer.name,
      role: 'customer',
      at: '2026-10-15T08:10Z',
      text: 'Radiology has been notified. Please keep one workstation online for emergency cases.',
    },
  ],
};

export const resolvedEvent = {
  kind: 'event',
  icon: 'checkCircle',
  actor: staff.owner,
  key: 'event.proposedClose',
  status: 'resolved',
  at: '2026-10-18T02:40Z',
};

// Filters and cards carry message keys and numbers; the screens turn them into text.
export const statusCounts = [
  { id: 'all' },
  { id: 'open', count: 6 },
  { id: 'in_progress', count: 14 },
  { id: 'resolved', count: 4 },
  { id: 'done' },
  { id: 'cancelled' },
  { id: 'transferred' },
];

const org = (name, tone, badge, value, latest, ago, meta, internal = false) => ({
  name,
  internal,
  value,
  badge: { tone, key: badge[0], n: badge[1] },
  latest,
  ago,
  meta: { key: meta[0], n: meta[1] },
});

export const organizations = [
  org('Lanna Medical Group', 'amber', ['org.awaiting', 2], 7, '#1042 PACS server upgrade', [-12, 'minute'], ['org.inProgress', 3]),
  org('Andaman Hospital', 'red', ['org.pastDue', 1], 4, '#1040 HL7 interface drops orders', [-1, 'hour'], ['org.inProgress', 2]),
  org('Chao Phraya Clinic', 'blue', ['org.waitingOnUs'], 3, '#1039 New modality worklist', [-3, 'hour'], ['org.inProgress', 1]),
  org('Isan Regional Hospital', 'green', ['org.allConfirmed'], 0, '#1021 Viewer licence renewal', [-2, 'day'], ['org.doneYear', 18]),
  org('Rayong Imaging Lab', 'amber', ['org.awaiting', 1], 2, '#1036 CD burner fails on finalize', [-1, 'day'], ['org.inProgress', 1]),
  org('Sukhumvit Dental', 'slate', ['org.notStarted'], 1, '#1041 Panoramic X-ray import', [-5, 'hour'], ['org.inProgress', 0]),
  org('Mekong Eye Centre', 'blue', ['org.waitingOnUs'], 2, '#1033 OCT images not archiving', [-2, 'day'], ['org.inProgress', 2]),
  org('PSP internal', 'violet', ['org.noCustomer'], 5, '#1037 Windows Server patch round', [-4, 'hour'], ['org.inProgress', 3], true),
];

export const orgTasks = [
  {
    id: '#1042',
    title: 'PACS server upgrade — Radiology',
    status: 'in_progress',
    owner: staff.owner,
    customer: customer.name,
    updated: { ago: [-12, 'minute'] },
  },
  {
    id: '#1038',
    title: 'Fax images arrive solid black, no preview',
    status: 'resolved',
    owner: staff.nicha,
    customer: 'Anan Kittisak',
    updated: { closesIn: 31 },
  },
  {
    id: '#1031',
    title: 'Add two radiologist accounts',
    status: 'open',
    owner: staff.kenji,
    customer: customer.name,
    updated: { ago: [-1, 'day'] },
  },
  {
    id: '#1019',
    title: 'Quarterly storage health check',
    status: 'done',
    owner: staff.owner,
    customer: customer.name,
    updated: { date: '2026-09-10' },
  },
  {
    id: '#1007',
    title: 'Worklist printer offline',
    status: 'done',
    owner: staff.nicha,
    customer: 'Anan Kittisak',
    updated: { date: '2026-08-23' },
  },
  {
    id: '#0994',
    title: 'VPN certificate renewal',
    status: 'cancelled',
    owner: staff.kenji,
    customer: customer.name,
    updated: { date: '2026-08-03' },
  },
];

export const orgStats = [
  { key: 'stat.open', value: 1, tone: 'slate' },
  { key: 'stat.inProgress', value: 3, tone: 'blue' },
  { key: 'stat.awaiting', value: 2, tone: 'amber' },
  { key: 'stat.doneYear', value: 14, tone: 'green' },
];

// --- Activity: the Timeline of every Task, condensed to its events ------------------
// Tones: primary = Task opened, amber = Resolved, green = Done, none = comment or other event.
export const activityRange = { from: '2026-05-01', to: '2026-10-31' };
export const activityLegend = [
  { tone: 'primary', key: 'legend.opened' },
  { tone: '', key: 'legend.event' },
  { tone: 'amber', key: 'legend.resolved' },
  { tone: 'green', key: 'legend.done' },
];

// One Customer's events on one Task: [date, tone, summary, weight?]
const events = (title, status, owner, who, list) =>
  list.map(([date, tone, summary, weight = 1]) => ({
    date,
    tone,
    summary,
    weight,
    title,
    status,
    people: [owner, who],
  }));

const ploy = customer.name;
const anan = 'Anan Kittisak';

export const lannaActivity = {
  name: 'Lanna Medical Group',
  rows: [
    {
      name: ploy,
      points: [
        ...events('#0951 New reading workstation', 'done', staff.kenji, ploy, [
          ['2026-05-12', 'primary', 'Task opened for a new reading workstation.'],
          ['2026-05-15', '', 'Workstation imaged and delivered.'],
          ['2026-05-20', 'green', 'Customer confirmed it is in use.'],
        ]),
        ...events('#0994 VPN certificate renewal', 'cancelled', staff.kenji, ploy, [
          ['2026-07-27', 'primary', 'Task opened for the certificate renewal.'],
          ['2026-08-03', '', 'Cancelled by the Customer: handled by their IT team.'],
        ]),
        ...events('#1019 Quarterly storage health check', 'done', staff.owner, ploy, [
          ['2026-08-31', 'primary', 'Quarterly storage health check started.', 2],
          ['2026-09-05', '', 'Report attached: 71% of capacity in use.'],
          ['2026-09-08', 'amber', 'Closure proposed to the Customer.'],
          ['2026-09-10', 'green', 'Customer confirmed after reading the report.'],
        ]),
        ...events('#1031 Add two radiologist accounts', 'open', staff.kenji, ploy, [
          ['2026-09-17', 'primary', 'Two new radiologist accounts requested.'],
        ]),
        ...events('#1042 PACS server upgrade — Radiology', 'in_progress', staff.owner, ploy, [
          ['2026-10-12', 'primary', 'Task opened, plan attached, Customer agreed to the downtime.', 3],
          ['2026-10-13', '', 'Collaborators added.'],
          ['2026-10-14', '', 'Site access confirmed with building security.', 2],
          ['2026-10-15', '', 'Radiology notified; one workstation stays online.'],
        ]),
      ],
    },
    {
      name: anan,
      points: [
        ...events('#0970 Report template change', 'done', staff.nicha, anan, [
          ['2026-06-18', 'primary', 'New report template requested.'],
          ['2026-06-24', 'green', 'Customer confirmed the template.'],
        ]),
        ...events('#1007 Worklist printer offline', 'done', staff.nicha, anan, [
          ['2026-08-14', 'primary', 'Worklist printer reported offline during night shift.', 2],
          ['2026-08-18', '', 'Replacement driver installed, awaiting a test print.'],
          ['2026-08-21', 'amber', 'Closure proposed to the Customer.'],
          ['2026-08-23', 'green', 'Customer confirmed the printer is back.'],
        ]),
        ...events('#1038 Fax images arrive solid black, no preview', 'resolved', staff.nicha, anan, [
          ['2026-09-23', 'primary', 'Fax images arriving solid black, screenshot attached.', 3],
          ['2026-09-26', '', 'Reproduced: the TIFF compression setting was changed.', 2],
          ['2026-10-14', 'amber', 'Fix deployed, closure proposed to the Customer.'],
        ]),
      ],
    },
  ],
};

export const allActivity = [
  lannaActivity,
  {
    name: 'Andaman Hospital',
    rows: [
      {
        name: 'Malee Charoen',
        points: [
          ...events('#0962 HL7 feed setup', 'done', staff.owner, 'Malee Charoen', [
            ['2026-06-03', 'primary', 'HL7 feed to the new HIS requested.', 2],
            ['2026-06-10', '', 'Test messages accepted by the HIS.'],
            ['2026-06-17', 'green', 'Customer confirmed the feed is live.'],
          ]),
          ...events('#1040 HL7 interface drops orders', 'in_progress', staff.owner, 'Malee Charoen', [
            ['2026-10-01', 'primary', 'Orders missing from the worklist since the HIS update.', 2],
            ['2026-10-06', '', 'Logs requested from the HIS vendor.'],
            ['2026-10-13', '', 'Mapping fix under test.', 2],
          ]),
        ],
      },
      {
        name: 'Prasit Noi',
        points: [
          ...events('#1001 Modality AE title change', 'done', staff.kenji, 'Prasit Noi', [
            ['2026-08-05', 'primary', 'AE title change for the replaced CT.'],
            ['2026-08-07', 'green', 'Customer confirmed images arrive.'],
          ]),
          ...events('#1034 Technologist cannot sign in', 'done', staff.nicha, 'Prasit Noi', [
            ['2026-09-28', 'primary', 'Account locked after a password change.'],
            ['2026-09-29', 'green', 'Customer confirmed access is restored.'],
          ]),
        ],
      },
    ],
  },
  {
    name: 'Chao Phraya Clinic',
    rows: [
      {
        name: 'Kanya Rattana',
        points: [
          ...events('#0983 Viewer shortcut training', 'done', staff.nicha, 'Kanya Rattana', [
            ['2026-07-08', 'primary', 'Training session requested for new staff.'],
            ['2026-07-15', 'green', 'Session held, Customer confirmed.'],
          ]),
          ...events('#1039 New modality worklist', 'in_progress', staff.kenji, 'Kanya Rattana', [
            ['2026-10-08', 'primary', 'Worklist needed for the new ultrasound.'],
            ['2026-10-10', '', 'Connection details received.'],
            ['2026-10-14', '', 'Worklist configured, awaiting a test study.'],
          ]),
        ],
      },
    ],
  },
];
