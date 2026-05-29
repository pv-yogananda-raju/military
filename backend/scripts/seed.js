import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Load models
import Officer from '../models/Officer.js';
import IntelligenceReport from '../models/IntelligenceReport.js';
import Mission from '../models/Mission.js';
import Evidence from '../models/Evidence.js';
import Alert from '../models/Alert.js';
import AuditLog from '../models/AuditLog.js';
import Session from '../models/Session.js';
import Suspect from '../models/Suspect.js';
import Message from '../models/Message.js';

dotenv.config();

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/miscs';
    console.log(`[*] Seeding database at URI: ${mongoUri}`);
    
    await mongoose.connect(mongoUri);
    console.log(`[*] Successfully connected to MongoDB for seeding.`);

    // 1. Clear existing database collections
    console.log(`[*] Purging existing collections...`);
    await Officer.deleteMany({});
    await IntelligenceReport.deleteMany({});
    await Mission.deleteMany({});
    await Evidence.deleteMany({});
    await Alert.deleteMany({});
    await AuditLog.deleteMany({});
    await Session.deleteMany({});
    await Suspect.deleteMany({});
    await Message.deleteMany({});
    console.log(`[+] Database purged.`);

    // 2. Hash default passwords
    const salt = bcrypt.genSaltSync(10);
    const defaultPasswordHash = bcrypt.hashSync('password123', salt);

    // 3. Create Officers
    console.log(`[*] Seeding Officers (Admin, Intelligence, Analyst, Field)...`);
    const officers = [
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
        passwordHash: defaultPasswordHash,
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
        passwordHash: defaultPasswordHash,
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
        passwordHash: defaultPasswordHash,
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
        passwordHash: defaultPasswordHash,
      },
    ];

    await Officer.insertMany(officers);
    console.log(`[+] Seeded ${officers.length} Officers.`);

    // 4. Create Missions
    console.log(`[*] Seeding Tactical Missions...`);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const missions = [
      {
        missionCode: 'MSN-501',
        missionName: 'Operation Trishul',
        priority: 'Critical',
        assignedOfficers: ['OFF-102', 'OFF-104'],
        objective: 'Infiltrate the encrypted rogue network node discovered in the Jammu & Kashmir Sector and extract data core packages.',
        deadline: weekFromNow,
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
      },
      {
        missionCode: 'MSN-502',
        missionName: 'Operation Vijay',
        priority: 'High',
        assignedOfficers: ['OFF-103'],
        objective: 'Intercept rogue radio transmissions emanating from the Rajasthan Border sector. Triangulate source signals.',
        deadline: tomorrow,
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
      },
      {
        missionCode: 'MSN-503',
        missionName: 'Operation Meghdoot',
        priority: 'Medium',
        assignedOfficers: ['OFF-101', 'OFF-102'],
        objective: 'Fortify localized military firewall infrastructure at the Bangalore Central Server Array against incoming probe requests.',
        deadline: weekFromNow,
        missionZone: 'Bangalore Central Server Array',
        currentStatus: 'Pending',
        progressPercentage: 0,
        missionLogs: [],
      },
      {
        missionCode: 'MSN-504',
        missionName: 'Operation Vijay (Phase I)',
        priority: 'Low',
        assignedOfficers: ['OFF-104'],
        objective: 'Scout peripheral communication installations in the Punjab Border Frontier and log system uptime.',
        deadline: yesterday, // Expired
        missionZone: 'Punjab Border Outpost',
        currentStatus: 'Completed',
        progressPercentage: 100,
        missionLogs: [
          {
            timestamp: yesterday,
            log: 'Scout operation completed successfully. Log files downloaded. Outpost marked as fully operational.',
            enteredBy: 'OFF-104',
          },
        ],
      },
    ];

    await Mission.insertMany(missions);
    console.log(`[+] Seeded ${missions.length} Missions.`);

    // 5. Create Intelligence Reports
    console.log(`[*] Seeding Intelligence Reports...`);
    const reports = [
      {
        reportId: 'REP-1001',
        title: 'Rogue Signal Relay Jammu Sector',
        description: 'Passive packet sniffing discovered an unlisted server routing high-bandwidth encrypted military packets to unidentified satellite nodes. Visual scanning suggests a remote brick server bank reinforced with military-grade backup battery generators.',
        threatLevel: 'Critical',
        assignedOfficer: 'OFF-102',
        suspectDetails: 'Devendra Malik (Rogue asset linked to cross-border cyber-espionage networks)',
        location: 'Jammu Command Sector (32.72, 74.85)',
        evidence: ['EVI-2002', 'EVI-2003'],
        notes: 'Target node is protected by a localized secure hardware firewall. Physical connection required for extraction.',
        status: 'Under Review',
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
      },
      {
        reportId: 'REP-1003',
        title: 'Localized Port Scanning Grid New Delhi HQ',
        description: 'Internal firewalls logged several ping sweeps and TCP connect scans focusing on active database structures. The scan originated from a physical intranet junction terminal.',
        threatLevel: 'Moderate',
        assignedOfficer: 'OFF-101',
        suspectDetails: 'None. Suspected unauthorized cadet terminal access.',
        location: 'New Delhi Tactical HQ Mainframe',
        evidence: [],
        notes: 'Access port temporarily locked. Physical logs retrieved for examination.',
        status: 'Archived',
      },
    ];

    await IntelligenceReport.insertMany(reports);
    console.log(`[+] Seeded ${reports.length} Intelligence Reports.`);

    // 6. Create Evidence Vault
    console.log(`[*] Seeding Evidence Logs...`);
    const evidence = [
      {
        evidenceId: 'EVI-2001',
        fileName: 'intercept_audio_log.wav',
        fileType: 'Audio',
        fileSize: '4.8 MB',
        fileUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Working public audio test link
        linkedMission: 'MSN-502',
        linkedReport: 'REP-1002',
        uploadedBy: 'OFF-103',
        hash: 'SHA-256:8F3A2B5E91C0D4F7A6B5C3D2E1F0A9B8',
        status: 'Processed',
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
        hash: '', // Set empty to demonstrate background evidence processing!
        status: 'Processing',
      },
      {
        evidenceId: 'EVI-2003',
        fileName: 'dossier_devendra_malik.pdf',
        fileType: 'PDF',
        fileSize: '1.4 MB',
        fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', // Public PDF test link
        linkedMission: 'MSN-501',
        linkedReport: 'REP-1001',
        uploadedBy: 'OFF-102',
        hash: 'SHA-256:C5A6B7E8D9C0F1A2B3C4D5E6F7A8B9C0',
        status: 'Processed',
      },
    ];

    await Evidence.insertMany(evidence);
    console.log(`[+] Seeded ${evidence.length} Evidence entries.`);

    // 7. Create Alerts
    console.log(`[*] Seeding Tactical Alerts...`);
    const alerts = [
      {
        alertId: 'ALT-101',
        title: 'JAMMU SECTOR BREACH DETECTED',
        message: 'Intelligence report REP-1001 details unauthorized rogue server node routing secure traffic. Direct threat to Indian military communication backbones.',
        priority: 'Critical',
        linkedEntity: 'REP-1001',
        isRead: false,
        creatorId: 'OFF-101',
        targetedOfficers: [],
      },
      {
        alertId: 'ALT-102',
        title: 'THAR FRONTIER SIGNAL INTERCEPTED',
        message: 'High frequency transmitter scanned in Thar Desert border sector. Relayed to Surveillance Analyst for mapping.',
        priority: 'Important',
        linkedEntity: 'REP-1002',
        isRead: false,
        creatorId: 'OFF-101',
        targetedOfficers: [],
      },
    ];

    await Alert.insertMany(alerts);
    console.log(`[+] Seeded ${alerts.length} Alerts.`);

    // 8. Create Suspects
    console.log(`[*] Seeding Suspect Registry...`);
    const suspects = [
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
      }
    ];
    await Suspect.insertMany(suspects);
    console.log(`[+] Seeded ${suspects.length} Suspects.`);

    // 9. Create Secure Comms Messages
    console.log(`[*] Seeding Tactical Messages...`);
    const messages = [
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
    await Message.insertMany(messages);
    console.log(`[+] Seeded ${messages.length} Messages.`);

    // 10. Create Initial Audit Logs
    console.log(`[*] Seeding Audit Logs...`);
    const auditLogs = [
      {
        logId: 'AUD-1001',
        user: 'System Bootstrap Engine',
        module: 'System',
        action: 'Database successfully seeded and collections indexed. Main encryption hashes loaded.',
        deviceDetails: 'Primary Server Node',
        ipAddress: '127.0.0.1',
      },
      {
        logId: 'AUD-1002',
        user: 'Commander P.V. Yogananda Raju (OFF-101)',
        module: 'Authentication',
        action: 'Officer authorized. Token session established. Security Clearance level [Cosmic Top Secret] applied.',
        deviceDetails: 'Base Command Console',
        ipAddress: '10.0.0.1',
      },
    ];

    await AuditLog.insertMany(auditLogs);
    console.log(`[+] Seeded ${auditLogs.length} Audit Logs.`);

    console.log(`\n======================================================`);
    console.log(`[SUCCESS] Database Seed Complete!`);
    console.log(`- Login Username (Officer ID): OFF-101, OFF-102, OFF-103, OFF-104`);
    console.log(`- Default password for all officers: password123`);
    console.log(`======================================================\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`[!] Seeding Failed: ${error.message}`);
    process.exit(1);
  }
};

seedData();
