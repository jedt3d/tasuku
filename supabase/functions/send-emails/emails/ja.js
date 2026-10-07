export default {
  added: {
    subject: 'タスク #{id} に追加されました: {title}',
    body: '{actor} があなたをタスク #{id}「{title}」に追加しました。\n\nタスクを開く:\n{link}',
  },
  comment: {
    subject: 'タスク #{id} に新しいコメント: {title}',
    body: '{actor} がタスク #{id}「{title}」にコメントしました。\n\nこちらからご覧ください:\n{link}',
  },
  resolved: {
    subject: 'タスク #{id} が解決済みになりました: 問題ありませんか?',
    body: '{actor} はタスク #{id}「{title}」を完了と判断しました。\n\nタスクを開いて、完了を確認するか再開してください:\n{link}',
  },
  cancelled: {
    subject: 'カスタマーがタスク #{id} をキャンセルしました: {title}',
    body: '{actor} がタスク #{id}「{title}」をキャンセルしました。これ以上の作業は不要です。\n\nタスクを開く:\n{link}',
  },
};
