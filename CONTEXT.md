# Tasuku (タスク)

An internal work-request tracker for PSP and the Customers it supports, built in-house so that adding people never incurs a per-seat fee and the workflow is not tied to a helpdesk vendor.

## Language

### Work

**Task**:
A single piece of work tracked until both sides agree it is finished. It is the unit that write access is granted on, and it involves at most one Customer.
_Avoid_: Ticket, case, issue

**Request**:
A Customer's report asking for support, not yet accepted as work. A Staff member assesses it and either opens a Task from it or cancels it.
_Avoid_: Ticket, case, new task

**Issue**:
A unit of development work on Tasuku itself, living in the GitHub issue tracker. Never a record inside the product.
_Avoid_: Ticket, task (for dev work)

**Timeline**:
The single main sequence of events and comments on a Task; the only part of a Task its Customer sees.
_Avoid_: Main branch, feed, history

**Thread**:
An internal sub-task split off from a point on the Timeline, covering one topic and having its own responsible Staff member. Customers never see Threads.
_Avoid_: Branch, subtask, internal note, side conversation

### Task status

**Open**:
A Task that exists but that no Staff member has commented on yet.

**In progress**:
A Task that Staff have started working on.

**Resolved**:
A Task whose Owner considers the work finished and has proposed closing it; it still awaits confirmation.
_Avoid_: Request for review, pending close

**Done**:
A Task whose closure is final, either confirmed after Resolved or closed directly by the Customer.
_Avoid_: Closed, completed

**Reopen**:
To send a Resolved Task back to In progress because the proposed closure was not accepted.
_Avoid_: Reject

**Cancelled**:
A Task or Request that was abandoned without the work being done.

### People

**Staff**:
A person employed by PSP or one of its subsidiaries (e.g. PSPA) whose email a Task Master has registered. Staff can read every Task, including its Threads, and the list of Staff, but can only write on Tasks they own or collaborate on.
_Avoid_: Member, employee, agent, user

**Removed**:
A Staff member whose access a Task Master has taken away. They can read and change nothing from that moment, but their record is kept so that Tasks still name them; a Task Master can add them again.
_Avoid_: Deleted, deactivated, disabled

**Customer**:
A person outside PSP, identified by a verified email address, who can only reach their own Requests and the Tasks they have been added to. A Staff member's email can also be added as the Customer of a Task; what they write there still counts as Staff's. Such a Staff member confirms, Reopens and cancels as the Customer does, unless they are the Owner of that Task: an Owner never confirms their own proposal.
_Avoid_: Guest, client, external user

**Task Master**:
A Staff member who administers Tasuku: decides which emails are Staff, runs the Request rotation, and may act on any Task, including reassigning its Owner without the receiver's acceptance.
_Avoid_: Admin, manager

**Owner**:
The one Staff member responsible for a Task; the only Staff member who may propose closing it. A Task with no Customer is closed by its Owner alone. An Owner can hand ownership to another Staff member, who must accept it first; a Task Master can reassign it without acceptance.
_Avoid_: Assignee, primary, lead

**Collaborator**:
A Staff member added to a Task to work on its content: comment, attach files and edit its details. A Collaborator cannot change the Owner, propose closing the Task or cancel it, and does not decide who is on it (Collaborators, Customer) or delete attachments; those stay with the Owner and a Task Master.
_Avoid_: Supporter, collab staff, helper

**Organization**:
The outside company a Customer belongs to. A Task relates to at most one Organization; it is a label for grouping and grants no access.
_Avoid_: Company, account, client
