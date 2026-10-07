import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { anonymous, openTask, signInAs, staffMember, uniqueEmail } from './helpers.mjs';

const uniqueName = (name) => `${name} ${randomUUID().slice(0, 8)}`;

// Creates an Organization as `client`. Resolves to the API's answer, error included.
const createOrganization = (client, name = uniqueName('Hospital')) =>
  client.from('organizations').insert({ name }).select('id, name').single();

test('a Staff member creates an Organization, and every Staff member reads it', async () => {
  const name = uniqueName('Bangkok General');

  const created = await createOrganization(await staffMember(), name);

  assert.equal(created.error, null);
  const { data } = await (await staffMember()).from('organizations').select('name').eq('id', created.data.id);
  assert.deepEqual(data, [{ name }]);
});

test('an Organization needs a name, and no two share one', async () => {
  const me = await staffMember();
  const name = uniqueName('Chiang Mai Clinic');
  await createOrganization(me, name);

  assert.equal((await createOrganization(me, ' \n ')).error?.code, '23514');
  assert.equal((await createOrganization(me, name.toUpperCase())).error?.code, '23505');
});

test('a Task relates to at most one Organization, set when it is opened or later', async () => {
  const owner = await staffMember();
  const { data: first } = await createOrganization(owner);
  const { data: second } = await createOrganization(owner);

  const task = await openTask(owner, { organization_id: first.id });
  const internal = await openTask(owner);
  const moved = await owner.from('tasks').update({ organization_id: second.id }).eq('id', task.id).select('organization_id');
  const cleared = await owner.from('tasks').update({ organization_id: null }).eq('id', task.id).select('organization_id');

  assert.equal(task.organization_id, first.id);
  assert.equal(internal.organization_id, null);
  assert.deepEqual(moved.data, [{ organization_id: second.id }]);
  assert.deepEqual(cleared.data, [{ organization_id: null }]);
});

test('Staff who are not on a Task cannot change its Organization', async () => {
  const owner = await staffMember();
  const { data: organization } = await createOrganization(owner);
  const task = await openTask(owner);

  const { data } = await (await staffMember())
    .from('tasks')
    .update({ organization_id: organization.id })
    .eq('id', task.id)
    .select();

  assert.deepEqual(data, []);
});

test('Staff list Tasks filtered by Organization', async () => {
  const owner = await staffMember();
  const { data: hospital } = await createOrganization(owner);
  const { data: clinic } = await createOrganization(owner);
  const first = await openTask(owner, { organization_id: hospital.id });
  const second = await openTask(await staffMember(), { organization_id: hospital.id });
  await openTask(owner, { organization_id: clinic.id });
  await openTask(owner);

  const { data, error } = await (await staffMember())
    .from('tasks')
    .select('id, organization:organizations(name)')
    .eq('organization_id', hospital.id)
    .order('id');

  assert.equal(error, null);
  assert.deepEqual(data, [
    { id: first.id, organization: { name: hospital.name } },
    { id: second.id, organization: { name: hospital.name } },
  ]);
});

test('a user who is not Staff reads no Organization and cannot create one', async () => {
  await createOrganization(await staffMember());
  const stranger = await signInAs(uniqueEmail('stranger'));

  assert.deepEqual((await stranger.from('organizations').select('*')).data, []);
  assert.equal((await createOrganization(stranger)).error?.code, '42501');
  assert.equal((await anonymous().from('organizations').select('*')).error?.code, '42501');
});
