import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addCollaborator,
  anonymous,
  attach,
  close,
  comment,
  customerOf,
  openTask,
  pdf,
  signInAs,
  staffMember,
  taskMaster,
  transfer,
  uniqueEmail,
  upload,
  userId,
} from './helpers.mjs';

const bucket = (client) => client.storage.from('attachments');

// The attachments of `task` as `client` reads them, oldest first.
async function attachments(client, task) {
  const { data, error } = await client
    .from('attachments')
    .select('id, entry_id, path, name, mime_type, size, deleted_at, deleted_by')
    .eq('task_id', task.id)
    .order('id');
  if (error) throw error;
  return data;
}

// Asks for a short-lived link to `path` as `client` and fetches it. Resolves to the bytes, or to
// null when no link is issued.
async function fetchFile(client, path) {
  const { data, error } = await bucket(client).createSignedUrl(path, 60);
  if (error) return null;
  const response = await fetch(data.signedUrl);
  assert.equal(response.status, 200);
  return Buffer.from(await response.arrayBuffer());
}

const kinds = async (client, task) =>
  (await client.from('timeline_entries').select('kind').eq('task_id', task.id).order('id')).data.map(
    (entry) => entry.kind,
  );

test('a participant attaches a PDF to a comment', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);

  const { data: entry, error } = await attach(owner, task, { body: 'The report.' });
  assert.equal(error, null);

  const [file] = await attachments(owner, task);
  assert.deepEqual(
    { ...file, id: null, path: null },
    {
      id: null,
      entry_id: entry,
      path: null,
      name: 'report.pdf',
      mime_type: 'application/pdf',
      size: pdf.length,
      deleted_at: null,
      deleted_by: null,
    },
  );
  assert.deepEqual(await fetchFile(owner, file.path), pdf);
});

test('a comment can be files without text, but not nothing at all', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);

  const sent = await attach(owner, task, { names: ['a.pdf', 'b.pdf'] });
  assert.equal(sent.error, null);
  const { data: entry } = await owner.from('timeline_entries').select('body, author_id').eq('id', sent.data).single();
  assert.deepEqual(entry, { body: null, author_id: await userId(owner) });
  assert.equal((await attachments(owner, task)).length, 2);

  assert.equal((await comment(owner, task, null)).error?.code, '23514');
  assert.equal((await attach(owner, task, { names: [] })).error?.code, '22023');
  const { data: written } = await comment(owner, task, 'Text.');
  const emptied = await owner.from('timeline_entries').update({ body: null }).eq('id', written.id).select();
  assert.equal(emptied.error?.code, '23514');
});

test('Storage refuses other file types and files over 10 MB', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);

  const zip = await upload(owner, task, Buffer.from('PK\x03\x04'), 'application/zip');
  assert.match(zip.error?.message ?? '', /mime type application\/zip is not supported/);

  const large = await upload(owner, task, Buffer.alloc(10 * 1024 * 1024 + 1));
  assert.match(large.error?.message ?? '', /exceeded the maximum allowed size/);

  for (const type of ['image/webp', 'image/jpeg', 'image/png']) {
    assert.equal((await upload(owner, task, Buffer.from('x'), type)).error, null);
  }
});

test('only someone who may comment on the Task uploads to it and attaches', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const customer = await customerOf(owner, task);
  const colleague = await staffMember();
  const stranger = await signInAs(uniqueEmail('unregistered'));

  assert.equal((await attach(customer, task, { body: 'A screenshot.' })).error, null);

  for (const client of [colleague, stranger, anonymous()]) {
    assert.notEqual((await upload(client, task)).error, null);
  }
  for (const name of [`${task.id}/x`, 'x', `${task.id}/../x`]) {
    assert.notEqual((await bucket(owner).upload(name, pdf, { contentType: 'application/pdf' })).error, null);
  }

  // A file is attached by whoever uploaded it, to the Task it was uploaded to, once.
  const mine = await upload(owner, task);
  const files = [{ path: mine.path, name: 'mine.pdf' }];
  const other = await openTask(owner);
  await addCollaborator(owner, task, colleague);
  assert.equal((await colleague.rpc('comment_with_files', { task: task.id, body: '', files })).error?.code, 'P0002');
  assert.equal((await owner.rpc('comment_with_files', { task: other.id, body: '', files })).error?.code, 'P0002');
  assert.equal((await owner.rpc('comment_with_files', { task: task.id, body: '', files })).error, null);
  assert.equal((await owner.rpc('comment_with_files', { task: task.id, body: '', files })).error?.code, '23505');

  await close(owner, task, 'cancelled');
  assert.notEqual((await upload(owner, task)).error, null);
  assert.equal((await owner.rpc('comment_with_files', { task: task.id, body: '', files })).error?.code, '42501');
});

test('a file is fetched only by someone who may read the Task', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const customer = await customerOf(owner, task);
  const otherCustomer = await customerOf(owner, await openTask(owner));
  const unregistered = await signInAs(uniqueEmail('unregistered'));
  await attach(owner, task);
  const [{ path }] = await attachments(owner, task);

  assert.deepEqual(await fetchFile(customer, path), pdf);
  assert.deepEqual(await fetchFile(await staffMember(), path), pdf);

  for (const client of [otherCustomer, unregistered, anonymous()]) {
    assert.equal(await fetchFile(client, path), null);
    assert.notEqual((await bucket(client).download(path)).error, null);
    assert.deepEqual((await client.from('attachments').select('id').eq('task_id', task.id)).data ?? [], []);
  }

  // A file that was uploaded and never attached is read by nobody.
  const loose = await upload(owner, task);
  assert.equal(await fetchFile(owner, loose.path), null);
});

test('the files stay on a Transferred Task: its Customer still reads them, and the Customer of the new Task does not', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const customer = await customerOf(owner, task);
  await attach(customer, task);
  const [{ path }] = await attachments(customer, task);

  const { data: id, error } = await transfer(owner, task);
  assert.equal(error, null);
  const next = await customerOf(owner, { id });

  assert.deepEqual(await fetchFile(customer, path), pdf);
  assert.deepEqual(await attachments(owner, { id }), []);
  assert.equal(await fetchFile(next, path), null);
  assert.deepEqual(await attachments(next, task), []);
});

test('the Owner deletes an attachment: it shows on the Timeline and the file is erased', async () => {
  const owner = await staffMember();
  const task = await openTask(owner);
  const customer = await customerOf(owner, task);
  const collaborator = await staffMember();
  await addCollaborator(owner, task, collaborator);
  await attach(customer, task);
  const [file] = await attachments(owner, task);

  for (const client of [customer, collaborator, anonymous()]) {
    assert.equal((await client.rpc('delete_attachment', { attachment_id: file.id })).error?.code, '42501');
    assert.notEqual((await bucket(client).remove([file.path])).data?.length, 1);
  }
  assert.deepEqual(await fetchFile(customer, file.path), pdf);

  const deleted = await owner.rpc('delete_attachment', { attachment_id: file.id });
  assert.equal(deleted.error, null);
  assert.equal(deleted.data, file.path);

  const [marker] = await attachments(customer, task);
  assert.equal(marker.name, null);
  assert.ok(marker.deleted_at);
  assert.equal(marker.deleted_by, await userId(owner));
  assert.equal((await kinds(customer, task)).at(-1), 'attachment_deleted');
  assert.equal(await fetchFile(customer, file.path), null);
  assert.equal((await owner.rpc('delete_attachment', { attachment_id: file.id })).error?.code, 'P0002');

  const erased = await bucket(owner).remove([file.path]);
  assert.equal(erased.error, null);
  assert.equal(erased.data.length, 1);
  assert.equal(await fetchFile(owner, file.path), null);
});

test('on a Done Task only a Task Master deletes an attachment', async () => {
  const owner = await staffMember();
  const master = await taskMaster();
  const task = await openTask(owner);
  await attach(owner, task);
  const [file] = await attachments(owner, task);
  await close(owner, task, 'cancelled');

  assert.equal((await owner.rpc('delete_attachment', { attachment_id: file.id })).error?.code, '42501');
  assert.equal((await master.rpc('delete_attachment', { attachment_id: file.id })).error, null);
  assert.equal((await bucket(master).remove([file.path])).data.length, 1);
});

test('deleting a comment deletes its files', async () => {
  const owner = await staffMember();
  const master = await taskMaster();
  const task = await openTask(owner);
  const { data: entry } = await attach(owner, task, { body: 'Two files.', names: ['a.pdf', 'b.pdf'] });
  const files = await attachments(owner, task);

  const deleted = await master.rpc('delete_comment', { entry_id: entry });
  assert.equal(deleted.error, null);
  assert.deepEqual(deleted.data.sort(), files.map((file) => file.path).sort());

  assert.deepEqual((await attachments(owner, task)).map((file) => file.name), [null, null]);
  assert.equal(await fetchFile(owner, files[0].path), null);
  // No event per file: the comment's own marker says it.
  assert.equal((await kinds(owner, task)).includes('attachment_deleted'), false);
  assert.equal((await bucket(master).remove(deleted.data)).data.length, 2);
});

test('a Task Master reads which deleted files are not erased yet, and erases them', async () => {
  const owner = await staffMember();
  const master = await taskMaster();
  const task = await openTask(owner);
  await attach(owner, task);
  const [file] = await attachments(owner, task);
  const waiting = async () =>
    (await master.rpc('unerased_attachments')).data.filter((row) => row.task_id === task.id).map((row) => row.path);

  assert.deepEqual(await waiting(), []);
  // The Owner deletes the file and the erasing never happens.
  await owner.rpc('delete_attachment', { attachment_id: file.id });

  assert.deepEqual(await waiting(), [file.path]);
  assert.equal((await owner.rpc('unerased_attachments')).error?.code, '42501');
  assert.equal(await fetchFile(await staffMember(), file.path), null);

  assert.equal((await bucket(master).remove([file.path])).data.length, 1);
  assert.deepEqual(await waiting(), []);
});
