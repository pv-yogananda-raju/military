import bcrypt from 'bcryptjs';

const salt = bcrypt.genSaltSync(10);
const defaultPasswordHash = bcrypt.hashSync('password123', salt);

// In-Memory Database collections
class MockDatabase {
  constructor() {
    this.officers = [
      {
        officerId: 'OFF-101',
        fullName: 'Commander P.V. Yogananda Raju',
        rank: 'General',
        role: 'Admin Commander',
        department: 'Strategic Joint Command',
        clearanceLevel: 'Cosmic Top Secret',
        contactDetails: {
          email: 'yogananda.raju@miscs.gov.in',
          phone: '+91 98765 43210',
        },
        status: 'Active',
        profileImage: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=200',
        dob: '1979-05-15',
        bloodGroup: 'A+',
        branchUnit: 'Joint Strategic Command Headquarters',
        enlistmentDate: '2001-07-12',
        cardIssueDate: '2025-01-01',
        cardExpirationDate: '2035-01-01',
        issuingAuthority: 'SECURED COMMAND SYSTEM',
        identificationMarks: 'Scar on right temple.',
        plainPassword: 'password123',
        passwordHash: defaultPasswordHash,
        createdAt: new Date(),
      },
      {
        officerId: 'OFF-102',
        fullName: 'Lt. Rohit B. Soimaraddi',
        rank: 'Colonel',
        role: 'Intelligence Officer',
        department: 'Cyber Warfare & Signals Intelligence',
        clearanceLevel: 'Top Secret',
        contactDetails: {
          email: 'rohit.soimaraddi@miscs.gov.in',
          phone: '+91 87654 32109',
        },
        status: 'Active',
        profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
        dob: '1984-11-23',
        bloodGroup: 'B+',
        branchUnit: 'Signals Intelligence & Cyber Relay Core',
        enlistmentDate: '2006-03-14',
        cardIssueDate: '2025-01-01',
        cardExpirationDate: '2035-01-01',
        issuingAuthority: 'SECURED COMMAND SYSTEM',
        identificationMarks: 'Mole under left eye.',
        plainPassword: 'password123',
        passwordHash: defaultPasswordHash,
        createdAt: new Date(),
      },
      {
        officerId: 'OFF-103',
        fullName: 'Major Vikram Malhotra',
        rank: 'Major',
        role: 'Surveillance Analyst',
        department: 'Tactical Reconnaissance Unit',
        clearanceLevel: 'Level 3',
        contactDetails: {
          email: 'vikram.malhotra@miscs.gov.in',
          phone: '+91 76543 21098',
        },
        status: 'Active',
        profileImage: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200',
        dob: '1988-02-09',
        bloodGroup: 'O-',
        branchUnit: 'Tactical Reconnaissance Battalion',
        enlistmentDate: '2010-09-01',
        cardIssueDate: '2025-01-01',
        cardExpirationDate: '2035-01-01',
        issuingAuthority: 'SECURED COMMAND SYSTEM',
        identificationMarks: 'Linear scar on left wrist.',
        plainPassword: 'password123',
        passwordHash: defaultPasswordHash,
        createdAt: new Date(),
      },
      {
        officerId: 'OFF-104',
        fullName: 'Capt. Aarav Sharma',
        rank: 'Captain',
        role: 'Field Officer',
        department: 'Special Forces Operations Group',
        clearanceLevel: 'Top Secret',
        contactDetails: {
          email: 'aarav.sharma@miscs.gov.in',
          phone: '+91 65432 10987',
        },
        status: 'In Field',
        profileImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200',
        dob: '1992-07-31',
        bloodGroup: 'AB+',
        branchUnit: 'Special Operations Task Force',
        enlistmentDate: '2014-06-18',
        cardIssueDate: '2025-01-01',
        cardExpirationDate: '2035-01-01',
        issuingAuthority: 'SECURED COMMAND SYSTEM',
        identificationMarks: 'Tattoo of eagles on chest.',
        plainPassword: 'password123',
        passwordHash: defaultPasswordHash,
        createdAt: new Date(),
      },
    ];

    this.missions = [
      {
        missionCode: 'MSN-501',
        missionName: 'Operation Trishul',
        priority: 'Critical',
        assignedOfficers: ['OFF-102', 'OFF-104'],
        objective: 'Infiltrate the encrypted rogue network node discovered in the Jammu & Kashmir Sector and extract data core packages.',
        deadline: new Date(Date.now() + 86400000 * 7),
        missionZone: 'Jammu Sector Command Hub',
        currentStatus: 'Active',
        progressPercentage: 65,
        missionLogs: [
          {
            timestamp: new Date(Date.now() - 86400000 * 2),
            log: 'Mission planned. Tactical parameters loaded. Officers OFF-102 and OFF-104 assigned.',
            enteredBy: 'OFF-101',
          },
          {
            timestamp: new Date(Date.now() - 86400000),
            log: 'Infiltrated sector perimeter undetected. Capt. Aarav Sharma established signals relay.',
            enteredBy: 'OFF-104',
          },
        ],
        createdAt: new Date(),
      },
      {
        missionCode: 'MSN-502',
        missionName: 'Operation Vijay',
        priority: 'High',
        assignedOfficers: ['OFF-103'],
        objective: 'Intercept rogue radio transmissions emanating from the Rajasthan Border sector. Triangulate source signals.',
        deadline: new Date(Date.now() + 86400000),
        missionZone: 'Thar Desert Outpost',
        currentStatus: 'Under Surveillance',
        progressPercentage: 40,
        missionLogs: [
          {
            timestamp: new Date(Date.now() - 86400000),
            log: 'Assigned Major Vikram Malhotra. Initiated signals scanning array at border outpost.',
            enteredBy: 'OFF-101',
          },
        ],
        createdAt: new Date(),
      },
      {
        missionCode: 'MSN-503',
        missionName: 'Operation Meghdoot',
        priority: 'Medium',
        assignedOfficers: ['OFF-101', 'OFF-102'],
        objective: 'Fortify localized military firewall infrastructure at the Bangalore Central Server Array against incoming probe requests.',
        deadline: new Date(Date.now() + 86400000 * 7),
        missionZone: 'Bangalore Central Server Array',
        currentStatus: 'Pending',
        progressPercentage: 0,
        missionLogs: [],
        createdAt: new Date(),
      },
    ];

    this.reports = [
      {
        reportId: 'REP-1001',
        title: 'Rogue Signal Relay Jammu Sector (Fault-Tolerant Mode)',
        description: 'Passive packet sniffing discovered an unlisted server routing high-bandwidth encrypted military packets to unidentified satellite nodes. Visual scanning suggests a remote brick server bank reinforced with military-grade backup battery generators.',
        threatLevel: 'Critical',
        assignedOfficer: 'OFF-102',
        suspectDetails: 'Devendra Malik (Rogue asset linked to cross-border cyber-espionage networks)',
        location: 'Jammu Command Sector (32.72, 74.85)',
        evidence: ['EVI-2002', 'EVI-2003'],
        notes: 'Target node is protected by a localized secure hardware firewall. Physical connection required for extraction.',
        status: 'Under Review',
        createdAt: new Date(),
      },
      {
        reportId: 'REP-1002',
        title: 'Rogue Signal Burst Thar Desert Border',
        description: 'A 15-second high-amplitude radio burst was detected at 430.5 MHz. The signal is modulated utilizing advanced spread-spectrum protocols, indicating highly structured military hardware encryption.',
        threatLevel: 'High',
        assignedOfficer: 'OFF-103',
        suspectDetails: 'Under Analysis. Presumed rogue cell signals operatives.',
        location: 'Thar Desert Frontier Outpost (26.91, 70.90)',
        evidence: ['EVI-2001'],
        notes: 'Frequency triangulated to within 1.2 kilometers of rogue militia encampments.',
        status: 'Submitted',
        createdAt: new Date(),
      },
    ];

    this.evidence = [
      {
        evidenceId: 'EVI-2001',
        fileName: 'intercept_audio_log.wav',
        fileType: 'Audio',
        fileSize: '4.8 MB',
        fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        linkedMission: 'MSN-502',
        linkedReport: 'REP-1002',
        uploadedBy: 'OFF-103',
        hash: 'SHA-256:8F3A2B5E91C0D4F7A6B5C3D2E1F0A9B8',
        status: 'Processed',
        createdAt: new Date(),
      },
      {
        evidenceId: 'EVI-2002',
        fileName: 'tactical_map_jammu.png',
        fileType: 'Image',
        fileSize: '12.2 MB',
        fileUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=600',
        linkedMission: 'MSN-501',
        linkedReport: 'REP-1001',
        uploadedBy: 'OFF-102',
        hash: 'SHA-256:9A3C2D5E81C0D4F7A6B5C3D2E1F0A9B8',
        status: 'Processed',
        createdAt: new Date(),
      },
    ];

    this.alerts = [
      {
        alertId: 'ALT-101',
        title: 'JAMMU SECTOR BREACH DETECTED',
        message: 'Intelligence report REP-1001 details unauthorized rogue server node routing secure traffic. Direct threat to Indian military communication backbones.',
        priority: 'Critical',
        linkedEntity: 'REP-1001',
        isRead: false,
        readBy: [],
        creatorId: 'OFF-101',
        targetedOfficers: [],
        createdAt: new Date(),
      },
    ];

    this.auditLogs = [
      {
        logId: 'AUD-1001',
        user: 'System Setup Coordinator (Thread-0)',
        module: 'System',
        action: 'Database offline. Initializing local in-memory JavaScript dataset backup modules dynamically.',
        deviceDetails: 'Server Boot Frame',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
      },
      {
        logId: 'AUD-1002',
        user: 'Simulation Engine (Mock-Thread)',
        module: 'Concurrency',
        action: 'Simulated database activity online. Monitoring memory storage grids.',
        deviceDetails: 'In-Memory Core',
        ipAddress: '10.0.0.1',
        createdAt: new Date(),
      },
    ];

    this.sessions = [];

    this.suspects = [
      {
        suspectId: 'SUS-301',
        fullName: 'Devendra Malik',
        alias: 'Viper',
        associatedThreatLevel: 'Critical',
        status: 'Wanted',
        location: 'Jammu & Kashmir Sector Border',
        description: 'Former communications engineer. Specializes in tactical network infiltration, spread-spectrum signals intercepts, and unauthorized database probes.',
        photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200',
        linkedReports: ['REP-1001'],
        linkedMissions: ['MSN-501'],
        createdAt: new Date(),
      },
      {
        suspectId: 'SUS-302',
        fullName: 'Siddharth Rao',
        alias: 'Phantom',
        associatedThreatLevel: 'High',
        status: 'Under Surveillance',
        location: 'Rajasthan Thar Desert Frontier',
        description: 'Suspected rogue signals operator. Directs encrypted bursts to localized border networks from unknown high-amplitude frequencies.',
        photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
        linkedReports: ['REP-1002'],
        linkedMissions: ['MSN-502'],
        createdAt: new Date(),
      }
    ];

    this.messages = [
      {
        messageId: 'MSG-3001',
        sender: 'OFF-101',
        recipient: 'GLOBAL',
        content: 'ATTENTION ALL OPERATIVES: Secure tactical channels are active. Keep secure signals synced.',
        isGroupChat: true,
        createdAt: new Date(Date.now() - 86400000),
      },
      {
        messageId: 'MSG-3002',
        sender: 'OFF-102',
        recipient: 'GLOBAL',
        content: 'Copy that, Commander. Signals relay active in Jammu Command Sector.',
        isGroupChat: true,
        createdAt: new Date(Date.now() - 86400000 + 60000),
      },
      {
        messageId: 'MSG-3003',
        sender: 'OFF-103',
        recipient: 'OFF-101',
        content: 'Commander, visual reconnaissance Thar Desert Frontier scans are loaded directly in report REP-1002.',
        isGroupChat: false,
        createdAt: new Date(Date.now() - 86400000 + 120000),
      }
    ];
  }

  // Helper to compile dashboard aggregates
  getDashboardStats() {
    const totalMissions = this.missions.length;
    const totalReports = this.reports.length;
    const totalOfficers = this.officers.length;
    const totalEvidence = this.evidence.length;
    const activeSessions = this.sessions.filter(s => s.status === 'Active').length || 1;

    // Helper to group by key
    const groupBy = (array, key) => {
      return array.reduce((acc, curr) => {
        const val = curr[key];
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {});
    };

    // Calculate in-memory officer activity
    const officerActivity = this.auditLogs.reduce((acc, curr) => {
      const u = curr.user.split(' (')[0];
      acc[u] = (acc[u] || 0) + 1;
      return acc;
    }, {});

    const monthlyTrends = [
      { month: '2026-03', count: 4 },
      { month: '2026-04', count: 7 },
      { month: '2026-05', count: totalReports },
    ];

    return {
      success: true,
      counts: {
        missions: totalMissions,
        reports: totalReports,
        officers: totalOfficers,
        evidence: totalEvidence,
        activeSessions,
      },
      aggregates: {
        missions: groupBy(this.missions, 'currentStatus'),
        reports: groupBy(this.reports, 'threatLevel'),
        officers: groupBy(this.officers, 'status'),
        auditModules: groupBy(this.auditLogs, 'module'),
        monthlyTrends,
        officerActivity,
      }
    };
  }
}

const mockDb = new MockDatabase();
export default mockDb;
