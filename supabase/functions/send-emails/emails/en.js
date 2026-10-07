export default {
  added: {
    subject: 'You were added to Task #{id}: {title}',
    body: '{actor} added you to Task #{id}, "{title}".\n\nOpen the Task:\n{link}',
  },
  comment: {
    subject: 'New comment on Task #{id}: {title}',
    body: '{actor} wrote a comment on Task #{id}, "{title}".\n\nRead it:\n{link}',
  },
  resolved: {
    subject: 'Task #{id} is Resolved: is it done for you?',
    body: '{actor} considers Task #{id}, "{title}", finished.\n\nOpen the Task to confirm it is Done, or to Reopen it:\n{link}',
  },
  cancelled: {
    subject: 'The Customer cancelled Task #{id}: {title}',
    body: '{actor} cancelled Task #{id}, "{title}". No more work is needed on it.\n\nOpen the Task:\n{link}',
  },
};
