import type { Role, ProjectStatus, ProjectPriority, TaskStatus, TaskPriority, AttendanceStatus, MilestoneStatus, ApprovalStatus, NotificationType, LeaveType, LeaveStatus, ReviewStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function getSeedData() {
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@123', salt);
  const userPasswordHash = await bcrypt.hash('User@123', salt);
  const clientPasswordHash = await bcrypt.hash('Client@123', salt);

  const users = [
    {
      id: 'usr_superadmin_01',
      name: 'Alex Vance',
      email: 'alex@planforge.io',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN' as Role,
      profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr_admin_02',
      name: 'Sarah Connor',
      email: 'sarah@planforge.io',
      passwordHash: adminPasswordHash,
      role: 'ADMIN' as Role,
      profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr_member_03',
      name: 'David Kim',
      email: 'david@planforge.io',
      passwordHash: userPasswordHash,
      role: 'TEAM_MEMBER' as Role,
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr_member_04',
      name: 'Elena Rostova',
      email: 'elena@planforge.io',
      passwordHash: userPasswordHash,
      role: 'TEAM_MEMBER' as Role,
      profileImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr_member_05',
      name: 'Marcus Chen',
      email: 'marcus@planforge.io',
      passwordHash: userPasswordHash,
      role: 'TEAM_MEMBER' as Role,
      profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
    {
      id: 'usr_client_06',
      name: 'Jonathan Sterling',
      email: 'jonathan@acmecorp.com',
      passwordHash: clientPasswordHash,
      role: 'CLIENT' as Role,
      profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    },
  ];

  const clients = [
    {
      id: 'cli_acme_01',
      name: 'Jonathan Sterling',
      company: 'Acme Corporation',
      email: 'jonathan@acmecorp.com',
      phone: '+1 (555) 234-5678',
      address: '100 Enterprise Way, Suite 400, San Francisco, CA 94105',
    },
    {
      id: 'cli_globex_02',
      name: 'Hank Scorpio',
      company: 'Globex Industries',
      email: 'hank@globex.com',
      phone: '+1 (555) 987-6543',
      address: '742 Evergreen Terrace, Cypress Creek, OR 97401',
    },
  ];

  const projects = [
    {
      id: 'proj_ecommerce_01',
      name: 'Acme Next-Gen Commerce Portal',
      description: 'Full redesign and architecture overhaul of core global retail checkout platform.',
      clientId: 'cli_acme_01',
      createdById: 'usr_superadmin_01',
      startDate: '2026-01-10T08:00:00.000Z',
      dueDate: '2026-09-30T18:00:00.000Z',
      status: 'ACTIVE' as ProjectStatus,
      priority: 'HIGH' as ProjectPriority,
      progress: 65,
    },
    {
      id: 'proj_globex_mobile_02',
      name: 'Globex Cloud Native Mobile App',
      description: 'Cross-platform iOS and Android companion app with real-time biometric telemetry.',
      clientId: 'cli_globex_02',
      createdById: 'usr_admin_02',
      startDate: '2026-02-01T08:00:00.000Z',
      dueDate: '2026-11-15T18:00:00.000Z',
      status: 'ACTIVE' as ProjectStatus,
      priority: 'URGENT' as ProjectPriority,
      progress: 40,
    },
  ];

  const projectMembers = [
    { id: 'pm_01', projectId: 'proj_ecommerce_01', userId: 'usr_superadmin_01' },
    { id: 'pm_02', projectId: 'proj_ecommerce_01', userId: 'usr_member_03' },
    { id: 'pm_03', projectId: 'proj_ecommerce_01', userId: 'usr_member_04' },
    { id: 'pm_04', projectId: 'proj_globex_mobile_02', userId: 'usr_admin_02' },
    { id: 'pm_05', projectId: 'proj_globex_mobile_02', userId: 'usr_member_05' },
  ];

  const tasks = [
    {
      id: 'tsk_01',
      title: 'Design Stripe & Apple Pay payment flows',
      description: 'Implement multi-currency checkout modals and 3D Secure verification.',
      projectId: 'proj_ecommerce_01',
      assignedToId: 'usr_member_03',
      createdById: 'usr_superadmin_01',
      status: 'COMPLETED' as TaskStatus,
      priority: 'HIGH' as TaskPriority,
      progress: 100,
      dueDate: '2026-03-01T00:00:00.000Z',
    },
    {
      id: 'tsk_02',
      title: 'Build automated stock sync engine',
      description: 'Sync inventory quantities via webhook consumers with sub-50ms latency.',
      projectId: 'proj_ecommerce_01',
      assignedToId: 'usr_member_04',
      createdById: 'usr_superadmin_01',
      status: 'IN_PROGRESS' as TaskStatus,
      priority: 'URGENT' as TaskPriority,
      progress: 50,
      dueDate: '2026-09-15T00:00:00.000Z',
    },
    {
      id: 'tsk_03',
      title: 'Setup mobile push notification gateway',
      description: 'Integrate APNS and FCM via unified message dispatch service.',
      projectId: 'proj_globex_mobile_02',
      assignedToId: 'usr_member_05',
      createdById: 'usr_admin_02',
      status: 'IN_PROGRESS' as TaskStatus,
      priority: 'HIGH' as TaskPriority,
      progress: 40,
      dueDate: '2026-10-01T00:00:00.000Z',
    },
  ];

  const milestones = [
    {
      id: 'mls_01',
      name: 'Alpha Checkout Pipeline Release',
      description: 'End-to-end sandbox purchase verification.',
      projectId: 'proj_ecommerce_01',
      dueDate: '2026-04-01T00:00:00.000Z',
      status: 'COMPLETED' as MilestoneStatus,
      progress: 100,
    },
    {
      id: 'mls_02',
      name: 'Beta Load & Stress Testing',
      description: 'Verify 10,000 concurrent shopping carts with 0.01% error budget.',
      projectId: 'proj_ecommerce_01',
      dueDate: '2026-09-01T00:00:00.000Z',
      status: 'IN_PROGRESS' as MilestoneStatus,
      progress: 60,
    },
  ];

  const approvals = [
    {
      id: 'appr_01',
      title: 'Cart UI / UX Wireframe Approval',
      description: 'Review final high-fidelity Figma prototypes for responsive checkout.',
      projectId: 'proj_ecommerce_01',
      deliverableUrl: 'https://figma.com/file/demo-prototype',
      status: 'APPROVED' as ApprovalStatus,
      requestedById: 'usr_member_03',
      reviewedById: 'usr_client_06',
      reviewedAt: '2026-02-15T14:30:00.000Z',
      comments: 'Approved with minor contrast adjustments.',
    },
  ];

  const comments = [
    {
      id: 'cmt_01',
      content: 'Payment sandbox integration passed 100% of integration test suites.',
      userId: 'usr_member_03',
      projectId: 'proj_ecommerce_01',
      taskId: 'tsk_01',
    },
  ];

  const today = new Date().toISOString().split('T')[0];
  const attendances = [
    {
      id: 'att_01',
      userId: 'usr_superadmin_01',
      date: today,
      clockIn: new Date(`${today}T08:50:00.000Z`).toISOString(),
      clockOut: null,
      status: 'PRESENT' as AttendanceStatus,
      totalWorkingMinutes: 320,
      totalBreakMinutes: 45,
      effectiveWorkingMinutes: 320,
    },
    {
      id: 'att_02',
      userId: 'usr_member_03',
      date: today,
      clockIn: new Date(`${today}T09:10:00.000Z`).toISOString(),
      clockOut: null,
      status: 'PRESENT' as AttendanceStatus,
      totalWorkingMinutes: 300,
      totalBreakMinutes: 30,
      effectiveWorkingMinutes: 300,
    },
  ];

  const breaks = [
    {
      id: 'brk_01',
      attendanceId: 'att_01',
      startTime: new Date(`${today}T12:00:00.000Z`).toISOString(),
      endTime: new Date(`${today}T12:45:00.000Z`).toISOString(),
      durationMinutes: 45,
    },
  ];

  const notifications = [
    {
      id: 'notif_01',
      userId: 'usr_member_03',
      title: 'Task Assigned',
      message: 'You have been assigned to task: "Design Stripe & Apple Pay payment flows"',
      type: 'TASK_ASSIGNED' as NotificationType,
      linkUrl: '/projects/proj_ecommerce_01',
      isRead: false,
    },
  ];

  // Leaves
  const leaves = [
    {
      id: 'lv_01',
      userId: 'usr_member_04',
      leaveType: 'CASUAL' as LeaveType,
      startDate: '2026-09-10',
      endDate: '2026-09-11',
      totalDays: 2.0,
      reason: 'Personal family commitments',
      isBackdated: false,
      status: 'APPROVED' as LeaveStatus,
      approvedById: 'usr_superadmin_01',
      rejectionReason: null,
      reviewedAt: new Date().toISOString(),
    },
    {
      id: 'lv_02',
      userId: 'usr_member_05',
      leaveType: 'SICK' as LeaveType,
      startDate: '2026-09-01',
      endDate: '2026-09-01',
      totalDays: 1.0,
      reason: 'Doctor appointment and fever recovery',
      isBackdated: true,
      status: 'PENDING' as LeaveStatus,
      approvedById: null,
      rejectionReason: null,
      reviewedAt: null,
    },
    {
      id: 'lv_03',
      userId: 'usr_member_03',
      leaveType: 'ANNUAL' as LeaveType,
      startDate: '2026-10-05',
      endDate: '2026-10-09',
      totalDays: 5.0,
      reason: 'Annual family vacation',
      isBackdated: false,
      status: 'PENDING' as LeaveStatus,
      approvedById: null,
      rejectionReason: null,
      reviewedAt: null,
    },
  ];

  // SOP Documents
  const sops = [
    {
      id: 'sop_01',
      title: 'Git Workflow & Branching Conventions',
      category: 'Engineering',
      content: '# Git Workflow Standard\n\n1. Always create feature branches from `main` named `feature/<ticket-id>-description`.\n2. Squash merge all PRs with approved peer code reviews.\n3. Ensure CI passes with 100% test coverage before requesting merge.\n4. Tag releases using Semantic Versioning (vMAJOR.MINOR.PATCH).',
      version: '2.1',
      tags: 'git,workflow,engineering,best-practices',
      createdById: 'usr_superadmin_01',
    },
    {
      id: 'sop_02',
      title: 'Incident Response & Production On-Call Protocol',
      category: 'Operations',
      content: '# Incident Response Protocol\n\n1. Declare P1/P2 incident in #incident-command.\n2. Acknowledge within 5 minutes.\n3. Spin up war room bridge and designate Incident Commander.\n4. Post public status page update every 15 minutes.\n5. Conduct post-mortem within 48 hours of mitigation.',
      version: '1.4',
      tags: 'incident,on-call,devops,p1',
      createdById: 'usr_superadmin_01',
    },
    {
      id: 'sop_03',
      title: 'Client Onboarding & Project Kickoff Standard',
      category: 'Client Success',
      content: '# Client Onboarding Standard\n\n1. Send welcome packet within 24 hours of signed contract.\n2. Schedule 60-minute technical discovery session.\n3. Provision PlanForge project board, invite client stakeholders.\n4. Deliver milestone roadmaps within first 5 business days.',
      version: '1.0',
      tags: 'clients,kickoff,project-management',
      createdById: 'usr_admin_02',
    },
  ];

  // Performance Reviews
  const reviews = [
    {
      id: 'rev_01',
      employeeId: 'usr_member_03',
      reviewerId: 'usr_superadmin_01',
      reviewPeriod: 'Q2 2026',
      score: 4.8,
      strengths: 'Outstanding architecture execution on payment infrastructure. High reliability in meeting milestone delivery targets.',
      improvements: 'Can take more initiative in mentoring junior engineers and leading architecture design reviews.',
      notes: 'Eligible for senior engineering lead track consideration.',
      status: 'PUBLISHED' as ReviewStatus,
    },
    {
      id: 'rev_02',
      employeeId: 'usr_member_04',
      reviewerId: 'usr_admin_02',
      reviewPeriod: 'Q2 2026',
      score: 4.5,
      strengths: 'Exceptional attention to edge cases and database performance optimization.',
      improvements: 'Expand domain knowledge on mobile client sync protocols.',
      notes: 'Great performance and dedication across all sprints.',
      status: 'ACKNOWLEDGED' as ReviewStatus,
    },
  ];

  // Activity Logs
  const activities = [
    {
      id: 'act_01',
      userId: 'usr_superadmin_01',
      action: 'USER_LOGIN',
      entityType: 'AUTH',
      entityId: 'usr_superadmin_01',
      details: 'Super Administrator Alex Vance logged into White Ink Business Portal',
      ipAddress: '192.168.1.100',
    },
    {
      id: 'act_02',
      userId: 'usr_member_03',
      action: 'CLOCK_IN',
      entityType: 'ATTENDANCE',
      entityId: 'att_02',
      details: 'David Kim clocked in on time at 09:10 AM',
      ipAddress: '192.168.1.105',
    },
    {
      id: 'act_03',
      userId: 'usr_member_04',
      action: 'LEAVE_APPLIED',
      entityType: 'LEAVE',
      entityId: 'lv_01',
      details: 'Elena Rostova applied for Casual Leave from 2026-09-10 to 2026-09-11',
      ipAddress: '192.168.1.112',
    },
    {
      id: 'act_04',
      userId: 'usr_superadmin_01',
      action: 'LEAVE_APPROVED',
      entityType: 'LEAVE',
      entityId: 'lv_01',
      details: 'Alex Vance approved Casual Leave request for Elena Rostova',
      ipAddress: '192.168.1.100',
    },
  ];

  // Chat Messages
  const chatMessages = [
    {
      id: 'msg_01',
      senderId: 'usr_superadmin_01',
      channel: 'general',
      content: 'Welcome everyone to the White Ink Business Portal! Please check out the new SOPs and submit your leave requests through the portal.',
      attachments: null,
      isDeleted: false,
    },
    {
      id: 'msg_02',
      senderId: 'usr_member_03',
      channel: 'general',
      content: 'Thanks Alex! The payment flow integration is currently deployed to sandbox.',
      attachments: null,
      isDeleted: false,
    },
    {
      id: 'msg_03',
      senderId: 'usr_admin_02',
      channel: 'general',
      content: '@all Friendly reminder: office timing is 09:30 AM to 06:30 PM with a 15-minute grace window. Keep your attendance updated!',
      attachments: null,
      isDeleted: false,
    },
  ];

  // System Settings
  const settings = {
    id: 'system_config',
    officeStartTime: '09:30',
    officeEndTime: '18:30',
    lateThresholdMinutes: 15,
    maxBreakMinutes: 60,
    defaultLeaveAllowance: 20,
    taskRules: JSON.stringify({
      requireReviewBeforeComplete: true,
      allowSelfAssign: true,
      maxActiveTasksPerMember: 5,
    }),
    reasonsList: JSON.stringify([
      'Traffic Congestion / Transit Delay',
      'Medical / Health Issue',
      'Family Emergency',
      'Bad Weather / Monsoon',
      'Vehicle Breakdown',
      'Prior Approved Late Entry',
      'Work From Remote Location',
      'Client Meeting Outside Office',
    ]),
  };

  // Schedule Overrides
  const scheduleOverrides = [
    {
      id: 'ovr_01',
      userId: 'usr_member_05',
      customStartTime: '10:30',
      customEndTime: '19:30',
      notes: 'Late shift schedule arrangement for US client time zone overlap.',
    },
  ];

  return {
    users,
    clients,
    projects,
    projectMembers,
    tasks,
    comments,
    attendances,
    breaks,
    milestones,
    approvals,
    notifications,
    leaves,
    sops,
    reviews,
    activities,
    chatMessages,
    settings,
    scheduleOverrides,
  };
}

export async function runSeed() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const seed = await getSeedData();

  // Delete in reverse foreign-key order
  try {
    await prisma.pushSubscription.deleteMany();
    await prisma.employeeScheduleOverride.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.performanceReview.deleteMany();
    await prisma.sOPDocument.deleteMany();
    await prisma.leaveRequest.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.break.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.clientApproval.deleteMany();
    await prisma.milestone.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.client.deleteMany();
    await prisma.user.deleteMany();
    await prisma.systemSettings.deleteMany();
  } catch (e) {
    console.warn('Prisma cleanup note:', e);
  }

  // Insert settings
  try {
    await prisma.systemSettings.create({ data: seed.settings });
  } catch (e) {
    console.warn('Seed settings note:', e);
  }

  // Insert users & clients
  for (const u of seed.users) {
    await prisma.user.create({ data: u });
  }
  for (const c of seed.clients) {
    await prisma.client.create({ data: c });
  }
  for (const p of seed.projects) {
    await prisma.project.create({
      data: {
        ...p,
        startDate: p.startDate ? new Date(p.startDate) : null,
        dueDate: p.dueDate ? new Date(p.dueDate) : null,
      },
    });
  }
  for (const pm of seed.projectMembers) {
    await prisma.projectMember.create({ data: pm });
  }
  for (const t of seed.tasks) {
    await prisma.task.create({
      data: {
        ...t,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
      },
    });
  }
  for (const m of seed.milestones) {
    await prisma.milestone.create({
      data: {
        ...m,
        dueDate: m.dueDate ? new Date(m.dueDate) : null,
      },
    });
  }
  for (const a of seed.approvals) {
    await prisma.clientApproval.create({
      data: {
        ...a,
        reviewedAt: a.reviewedAt ? new Date(a.reviewedAt) : null,
      },
    });
  }
  for (const c of seed.comments) {
    await prisma.comment.create({ data: c });
  }
  for (const att of seed.attendances) {
    await prisma.attendance.create({
      data: {
        ...att,
        clockIn: att.clockIn ? new Date(att.clockIn) : null,
        clockOut: att.clockOut ? new Date(att.clockOut) : null,
      },
    });
  }
  for (const b of seed.breaks) {
    await prisma.break.create({
      data: {
        ...b,
        startTime: new Date(b.startTime),
        endTime: b.endTime ? new Date(b.endTime) : null,
      },
    });
  }
  for (const n of seed.notifications) {
    await prisma.notification.create({ data: n });
  }
  for (const lv of seed.leaves) {
    await prisma.leaveRequest.create({
      data: {
        ...lv,
        reviewedAt: lv.reviewedAt ? new Date(lv.reviewedAt) : null,
      },
    });
  }
  for (const sop of seed.sops) {
    await prisma.sOPDocument.create({ data: sop });
  }
  for (const rev of seed.reviews) {
    await prisma.performanceReview.create({ data: rev });
  }
  for (const act of seed.activities) {
    await prisma.activityLog.create({ data: act });
  }
  for (const msg of seed.chatMessages) {
    await prisma.chatMessage.create({ data: msg });
  }
  for (const ovr of seed.scheduleOverrides) {
    await prisma.employeeScheduleOverride.create({ data: ovr });
  }

  console.log('Database seeded successfully with Prisma');
  await prisma.$disconnect();
}

if (process.argv[1]?.includes('seed.ts')) {
  runSeed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
