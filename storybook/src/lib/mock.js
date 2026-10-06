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
  due: '18 Oct 2026',
  refersTo: '#0987 PACS storage expansion',
  collaborators: [staff.nicha, staff.kenji],
  timeline: [
    { kind: 'event', icon: 'plus', actor: staff.owner, text: 'opened this Task', time: '12 Oct, 09:14' },
    {
      kind: 'comment',
      author: staff.owner,
      role: 'Owner',
      time: '12 Oct, 09:20',
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
              time: '13 Oct, 10:12',
              text: 'バックアップは完了しました。Staging has been on the new build since this morning.',
            },
            { author: staff.nicha, time: '13 Oct, 14:40', text: 'Verified — DICOM send and receive both pass.' },
          ],
        },
      ],
    },
    {
      kind: 'event',
      icon: 'activity',
      actor: 'Tasuku',
      text: 'moved this Task to',
      status: 'in_progress',
      time: '12 Oct, 09:20',
    },
    {
      kind: 'event',
      icon: 'userPlus',
      actor: staff.owner,
      text: `added ${customer.name} as Customer`,
      time: '12 Oct, 09:31',
    },
    {
      kind: 'comment',
      author: customer.name,
      role: 'Customer',
      time: '12 Oct, 11:02',
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
              time: '14 Oct, 09:05',
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
      text: `added ${staff.nicha} and ${staff.kenji} as Collaborators`,
      time: '13 Oct, 08:45',
    },
    {
      kind: 'comment',
      author: staff.nicha,
      role: 'Collaborator',
      time: '14 Oct, 16:30',
      edited: true,
      text: 'Access for three engineers is confirmed with building security from 21:30.',
    },
    { kind: 'deleted', icon: 'trash', time: '14 Oct, 16:48' },
    {
      kind: 'comment',
      author: customer.name,
      role: 'Customer',
      time: '15 Oct, 08:10',
      text: 'Radiology has been notified. Please keep one workstation online for emergency cases.',
    },
  ],
};

export const resolvedEvent = {
  kind: 'event',
  icon: 'checkCircle',
  actor: staff.owner,
  text: 'proposed closing this Task',
  status: 'resolved',
  time: '18 Oct, 02:40',
};

export const statusCounts = [
  { id: 'all', label: 'All Tasks' },
  { id: 'open', label: 'Open', count: 6 },
  { id: 'in_progress', label: 'In progress', count: 14 },
  { id: 'resolved', label: 'Resolved', count: 4 },
  { id: 'done', label: 'Done' },
  { id: 'cancelled', label: 'Cancelled' },
];

export const organizations = [
  {
    name: 'Lanna Medical Group',
    badge: { tone: 'amber', label: '2 awaiting confirmation' },
    value: 7,
    latest: '#1042 PACS server upgrade · 12 min ago',
    meta: '3 in progress',
  },
  {
    name: 'Andaman Hospital',
    badge: { tone: 'red', label: '1 past due' },
    value: 4,
    latest: '#1040 HL7 interface drops orders · 1 h ago',
    meta: '2 in progress',
  },
  {
    name: 'Chao Phraya Clinic',
    badge: { tone: 'blue', label: 'Waiting on us' },
    value: 3,
    latest: '#1039 New modality worklist · 3 h ago',
    meta: '1 in progress',
  },
  {
    name: 'Isan Regional Hospital',
    badge: { tone: 'green', label: 'All confirmed' },
    value: 0,
    latest: '#1021 Viewer licence renewal · 2 days ago',
    meta: '18 done this year',
  },
  {
    name: 'Rayong Imaging Lab',
    badge: { tone: 'amber', label: '1 awaiting confirmation' },
    value: 2,
    latest: '#1036 CD burner fails on finalize · yesterday',
    meta: '1 in progress',
  },
  {
    name: 'Sukhumvit Dental',
    badge: { tone: 'slate', label: 'Not started' },
    value: 1,
    latest: '#1041 Panoramic X-ray import · 5 h ago',
    meta: '0 in progress',
  },
  {
    name: 'Mekong Eye Centre',
    badge: { tone: 'blue', label: 'Waiting on us' },
    value: 2,
    latest: '#1033 OCT images not archiving · 2 days ago',
    meta: '2 in progress',
  },
  {
    name: 'PSP internal',
    internal: true,
    badge: { tone: 'violet', label: 'No Customer' },
    value: 5,
    latest: '#1037 Windows Server patch round · 4 h ago',
    meta: '3 in progress',
  },
];

export const orgTasks = [
  {
    id: '#1042',
    title: 'PACS server upgrade — Radiology',
    status: 'in_progress',
    owner: staff.owner,
    customer: customer.name,
    updated: '12 min ago',
  },
  {
    id: '#1038',
    title: 'Fax images arrive solid black, no preview',
    status: 'resolved',
    owner: staff.nicha,
    customer: 'Anan Kittisak',
    updated: 'closes automatically in 31 h',
  },
  {
    id: '#1031',
    title: 'Add two radiologist accounts',
    status: 'open',
    owner: staff.kenji,
    customer: customer.name,
    updated: 'yesterday',
  },
  {
    id: '#1019',
    title: 'Quarterly storage health check',
    status: 'done',
    owner: staff.owner,
    customer: customer.name,
    updated: '10 Sep',
  },
  {
    id: '#1007',
    title: 'Worklist printer offline',
    status: 'done',
    owner: staff.nicha,
    customer: 'Anan Kittisak',
    updated: '23 Aug',
  },
  {
    id: '#0994',
    title: 'VPN certificate renewal',
    status: 'cancelled',
    owner: staff.kenji,
    customer: customer.name,
    updated: '3 Aug',
  },
];

export const orgStats = [
  { label: 'Open', value: 1, tone: 'slate' },
  { label: 'In progress', value: 3, tone: 'blue' },
  { label: 'Awaiting confirmation', value: 2, tone: 'amber' },
  { label: 'Done this year', value: 14, tone: 'green' },
];

// --- Activity: the Timeline of every Task, condensed to its events ------------------
// Tones: primary = Task opened, amber = Resolved, green = Done, none = comment or other event.
export const activityRange = { from: '2026-05-01', to: '2026-10-31' };
export const activityLegend = [
  { tone: 'primary', label: 'Task opened' },
  { tone: '', label: 'Comment or event' },
  { tone: 'amber', label: 'Resolved' },
  { tone: 'green', label: 'Done' },
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
