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
    body: '{actor} はタスク #{id}「{title}」を完了と判断しました。\n\nタスクを開いて、完了を確認するか再開してください:\n{link}\n\nご返信がない場合、約 {hours} 時間後に自動で完了になります。',
  },
  reminder: {
    subject: 'タスク #{id} はまもなく自動で完了になります: {title}',
    body: 'タスク #{id}「{title}」は解決済みで、ご返信をお待ちしています。ご返信がない場合、約 {hours} 時間後に自動で完了になります。\n\nタスクを開いて、完了を確認するか再開してください:\n{link}',
  },
  closed: {
    subject: 'タスク #{id} は完了になりました: {title}',
    body: 'ご返信がなかったため、タスク #{id}「{title}」は自動で完了になりました。\n\n問題が続いている場合は {actor} にお知らせください。新しいタスクを作成します。\n\nタスクを開く:\n{link}',
  },
  cancelled: {
    subject: 'カスタマーがタスク #{id} をキャンセルしました: {title}',
    body: '{actor} がタスク #{id}「{title}」をキャンセルしました。これ以上の作業は不要です。\n\nタスクを開く:\n{link}',
  },
  assigned: {
    subject: 'タスク #{id} のオーナーになりました: {title}',
    body: '{actor} があなたをタスク #{id}「{title}」のオーナーにしました。\n\nタスクを開く:\n{link}',
  },
  unassigned: {
    subject: 'タスク #{id} のオーナーが変わりました: {title}',
    body: '{actor} がタスク #{id}「{title}」を {owner} に引き継ぎました。あなたはコラボレーターとして残ります。\n\nタスクを開く:\n{link}',
  },
};
