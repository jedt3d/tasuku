export default {
  added: {
    subject: 'คุณถูกเพิ่มเข้า Task #{id}: {title}',
    body: '{actor} เพิ่มคุณเข้า Task #{id} "{title}"\n\nเปิด Task:\n{link}',
  },
  comment: {
    subject: 'มี comment ใหม่ใน Task #{id}: {title}',
    body: '{actor} เขียน comment ใน Task #{id} "{title}"\n\nอ่านได้ที่:\n{link}',
  },
  resolved: {
    subject: 'Task #{id} เป็น Resolved แล้ว: คุณเห็นว่าเสร็จหรือยัง',
    body: '{actor} แจ้งว่า Task #{id} "{title}" เสร็จแล้ว\n\nเปิด Task เพื่อยืนยันว่า Done หรือ Reopen:\n{link}\n\nถ้าไม่มีการตอบกลับ Task จะเป็น Done เองในอีกประมาณ {hours} ชั่วโมง',
  },
  reminder: {
    subject: 'Task #{id} ใกล้จะปิดเองแล้ว: {title}',
    body: 'Task #{id} "{title}" เป็น Resolved และรอคำตอบจากคุณ ถ้าไม่มีการตอบกลับ Task จะเป็น Done เองในอีกประมาณ {hours} ชั่วโมง\n\nเปิด Task เพื่อยืนยันว่า Done หรือ Reopen:\n{link}',
  },
  closed: {
    subject: 'Task #{id} เป็น Done แล้ว: {title}',
    body: 'Task #{id} "{title}" เป็น Done เองแล้ว เพราะไม่มีการตอบกลับจากคุณ\n\nถ้ายังมีปัญหาอยู่ แจ้ง {actor} เพื่อเปิด Task ใหม่\n\nเปิด Task:\n{link}',
  },
  cancelled: {
    subject: 'Customer ยกเลิก Task #{id}: {title}',
    body: '{actor} ยกเลิก Task #{id} "{title}" ไม่ต้องทำงานนี้ต่อแล้ว\n\nเปิด Task:\n{link}',
  },
};
