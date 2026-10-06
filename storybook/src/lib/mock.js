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
    },
    {
      kind: 'event',
      icon: 'users',
      actor: staff.owner,
      text: `added ${staff.nicha} and ${staff.kenji} as Collaborators`,
      time: '13 Oct, 08:45',
    },
    {
      kind: 'thread',
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
    {
      kind: 'thread',
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
    updated: '28 Sep',
  },
  {
    id: '#1007',
    title: 'Worklist printer offline',
    status: 'done',
    owner: staff.nicha,
    customer: 'Anan Kittisak',
    updated: '14 Sep',
  },
  {
    id: '#0994',
    title: 'VPN certificate renewal',
    status: 'cancelled',
    owner: staff.kenji,
    customer: customer.name,
    updated: '2 Sep',
  },
];

export const orgStats = [
  { label: 'Open', value: 1, tone: 'slate' },
  { label: 'In progress', value: 3, tone: 'blue' },
  { label: 'Awaiting confirmation', value: 2, tone: 'amber' },
  { label: 'Done this year', value: 14, tone: 'green' },
];

const point = (day, hour, weight, tone, taskIndex, when, summary) => ({
  day,
  hour,
  weight,
  tone,
  when,
  summary,
  title: `${orgTasks[taskIndex].id} ${orgTasks[taskIndex].title}`,
  status: orgTasks[taskIndex].status,
  people: [orgTasks[taskIndex].owner, orgTasks[taskIndex].customer],
});

// 90 days, oldest on the left. Tones: primary = Task opened, amber = Resolved, green = Done.
export const activity = [
  point(4, 10, 1, '', 5, '22 Jul, 10:05', 'Customer asked to bring the renewal forward.'),
  point(9, 15, 2, 'primary', 5, '27 Jul, 15:20', 'Task opened for the certificate renewal.'),
  point(16, 9, 0, '', 5, '3 Aug, 09:02', 'Cancelled by the Customer: handled by their IT team.'),
  point(27, 21, 3, 'primary', 4, '14 Aug, 21:10', 'Worklist printer reported offline during night shift.'),
  point(31, 8, 1, '', 4, '18 Aug, 08:15', 'Replacement driver installed, awaiting test print.'),
  point(36, 13, 1, 'green', 4, '23 Aug, 13:30', 'Customer confirmed the printer is back.'),
  point(44, 11, 2, 'primary', 3, '31 Aug, 11:00', 'Quarterly storage health check started.'),
  point(49, 17, 0, '', 3, '5 Sep, 17:40', 'Report attached: 71% of capacity in use.'),
  point(54, 10, 1, 'green', 3, '10 Sep, 10:25', 'Closed after the Customer read the report.'),
  point(61, 7, 1, 'primary', 2, '17 Sep, 07:50', 'Two new radiologist accounts requested.'),
  point(67, 22, 3, 'primary', 1, '23 Sep, 22:05', 'Fax images arriving solid black, screenshot attached.'),
  point(70, 9, 2, '', 1, '26 Sep, 09:30', 'Reproduced: the TIFF compression setting was changed.'),
  point(74, 14, 1, 'amber', 1, '30 Sep, 14:10', 'Fix deployed, closure proposed to the Customer.'),
  point(78, 9, 2, 'primary', 0, '4 Oct, 09:14', 'PACS upgrade planned for Saturday night.'),
  point(80, 11, 1, '', 0, '6 Oct, 11:02', 'Customer agreed to the downtime window.'),
  point(83, 16, 2, '', 0, '9 Oct, 16:30', 'Site access confirmed with building security.'),
  point(86, 8, 0, '', 0, '12 Oct, 08:10', 'Radiology notified; one workstation stays online.'),
];
