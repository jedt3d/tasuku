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
    body: '{actor} แจ้งว่า Task #{id} "{title}" เสร็จแล้ว\n\nเปิด Task เพื่อยืนยันว่า Done หรือ Reopen:\n{link}',
  },
  cancelled: {
    subject: 'Customer ยกเลิก Task #{id}: {title}',
    body: '{actor} ยกเลิก Task #{id} "{title}" ไม่ต้องทำงานนี้ต่อแล้ว\n\nเปิด Task:\n{link}',
  },
};
