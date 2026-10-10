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
    body: '{actor} considers Task #{id}, "{title}", finished.\n\nOpen the Task to confirm it is Done, or to Reopen it:\n{link}\n\nIf we do not hear from you, it becomes Done by itself in about {hours} hours.',
  },
  reminder: {
    subject: 'Task #{id} closes by itself soon: {title}',
    body: 'Task #{id}, "{title}", is Resolved and waiting for your answer. If we do not hear from you, it becomes Done by itself in about {hours} hours.\n\nOpen the Task to confirm it is Done, or to Reopen it:\n{link}',
  },
  closed: {
    subject: 'Task #{id} is Done: {title}',
    body: 'Task #{id}, "{title}", became Done by itself because we did not hear from you.\n\nIf the problem is still there, tell {actor} and a new Task will be opened.\n\nOpen the Task:\n{link}',
  },
  cancelled: {
    subject: 'The Customer cancelled Task #{id}: {title}',
    body: '{actor} cancelled Task #{id}, "{title}". No more work is needed on it.\n\nOpen the Task:\n{link}',
  },
};
