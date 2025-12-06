// backend/src/models/index.js - Database Models Configuration
const { Sequelize, DataTypes } = require('sequelize');

// Initialize Sequelize
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://localhost:5432/obscura_miden', {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// ============================================================================
// ASSET MODEL
// ============================================================================
const Asset = sequelize.define('Asset', {
  id: {
    type: DataTypes.STRING(64),
    primaryKey: true,
    comment: 'Property unique identifier'
  },
  noteId: {
    type: DataTypes.STRING(128),
    unique: true,
    allowNull: false,
    comment: 'Miden note ID for this asset'
  },
  transactionId: {
    type: DataTypes.STRING(128),
    allowNull: false,
    comment: 'Miden transaction hash'
  },
  blockNumber: {
    type: DataTypes.INTEGER,
    comment: 'Block number where minted'
  },
  ipfsCid: {
    type: DataTypes.STRING(64),
    comment: 'IPFS CID for encrypted metadata'
  },
  owner: {
    type: DataTypes.STRING(128),
    allowNull: false,
    index: true,
    comment: 'Current owner Miden account ID'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  location: {
    type: DataTypes.STRING(255),
    index: true
  },
  price: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: 'Price in smallest unit'
  },
  propertyType: {
    type: DataTypes.ENUM('residential', 'commercial', 'land'),
    allowNull: false,
    index: true
  },
  status: {
    type: DataTypes.ENUM('active', 'in_escrow', 'sold', 'cancelled'),
    defaultValue: 'active',
    index: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional property metadata'
  },
  complianceVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  verifiedAt: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'assets',
  timestamps: true,
  indexes: [
    { fields: ['owner'] },
    { fields: ['status'] },
    { fields: ['propertyType'] },
    { fields: ['createdAt'] },
    { fields: ['noteId'], unique: true }
  ]
});

// ============================================================================
// OFFER MODEL
// ============================================================================
const Offer = sequelize.define('Offer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  assetId: {
    type: DataTypes.STRING(64),
    allowNull: false,
    references: {
      model: 'assets',
      key: 'id'
    }
  },
  buyer: {
    type: DataTypes.STRING(128),
    allowNull: false,
    index: true,
    comment: 'Buyer Miden account ID'
  },
  amount: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: 'Offer amount'
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'expired', 'completed'),
    defaultValue: 'pending',
    index: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  acceptedAt: {
    type: DataTypes.DATE
  },
  completedAt: {
    type: DataTypes.DATE
  },
  transactionId: {
    type: DataTypes.STRING(128),
    comment: 'Settlement transaction hash'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'offers',
  timestamps: true,
  indexes: [
    { fields: ['assetId'] },
    { fields: ['buyer'] },
    { fields: ['status'] },
    { fields: ['createdAt'] }
  ]
});

// ============================================================================
// ESCROW MODEL
// ============================================================================
const Escrow = sequelize.define('Escrow', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  offerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'offers',
      key: 'id'
    }
  },
  assetId: {
    type: DataTypes.STRING(64),
    allowNull: false,
    references: {
      model: 'assets',
      key: 'id'
    }
  },
  escrowAccountId: {
    type: DataTypes.STRING(128),
    unique: true,
    comment: 'Miden escrow smart account ID'
  },
  seller: {
    type: DataTypes.STRING(128),
    allowNull: false
  },
  buyer: {
    type: DataTypes.STRING(128),
    allowNull: false
  },
  amount: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('created', 'funded', 'released', 'refunded', 'disputed'),
    defaultValue: 'created',
    index: true
  },
  fundsLockedAt: {
    type: DataTypes.DATE
  },
  releasedAt: {
    type: DataTypes.DATE
  },
  createTxId: {
    type: DataTypes.STRING(128),
    comment: 'Escrow creation transaction'
  },
  fundTxId: {
    type: DataTypes.STRING(128),
    comment: 'Fund locking transaction'
  },
  settlementTxId: {
    type: DataTypes.STRING(128),
    comment: 'Settlement execution transaction'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'escrows',
  timestamps: true,
  indexes: [
    { fields: ['offerId'] },
    { fields: ['assetId'] },
    { fields: ['status'] },
    { fields: ['escrowAccountId'], unique: true, where: { escrowAccountId: { [Sequelize.Op.ne]: null } } }
  ]
});

// ============================================================================
// PROOF MODEL
// ============================================================================
const Proof = sequelize.define('Proof', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.STRING(128),
    allowNull: false,
    index: true,
    comment: 'Miden account ID of proof owner'
  },
  proofType: {
    type: DataTypes.ENUM('ownership', 'accreditation', 'jurisdiction', 'compliance'),
    allowNull: false,
    index: true
  },
  proofData: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'ZK proof data (base64 or hex)'
  },
  publicInputs: {
    type: DataTypes.JSONB,
    comment: 'Public inputs for verification'
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    index: true
  },
  verifiedAt: {
    type: DataTypes.DATE
  },
  verifierAddress: {
    type: DataTypes.STRING(128),
    comment: 'Account that verified this proof'
  },
  expiresAt: {
    type: DataTypes.DATE
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'proofs',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['proofType'] },
    { fields: ['verified'] },
    { fields: ['expiresAt'] }
  ]
});

// ============================================================================
// TRANSACTION LOG MODEL
// ============================================================================
const TransactionLog = sequelize.define('TransactionLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  transactionId: {
    type: DataTypes.STRING(128),
    unique: true,
    allowNull: false
  },
  blockNumber: {
    type: DataTypes.INTEGER,
    index: true
  },
  fromAccount: {
    type: DataTypes.STRING(128),
    index: true
  },
  toAccount: {
    type: DataTypes.STRING(128),
    index: true
  },
  transactionType: {
    type: DataTypes.ENUM('mint', 'transfer', 'consume', 'escrow_create', 'escrow_fund', 'settlement'),
    allowNull: false,
    index: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'failed'),
    defaultValue: 'pending',
    index: true
  },
  relatedAssetId: {
    type: DataTypes.STRING(64),
    references: {
      model: 'assets',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.BIGINT
  },
  gasUsed: {
    type: DataTypes.BIGINT
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'transaction_logs',
  timestamps: true,
  indexes: [
    { fields: ['transactionId'], unique: true },
    { fields: ['blockNumber'] },
    { fields: ['fromAccount'] },
    { fields: ['toAccount'] },
    { fields: ['transactionType'] },
    { fields: ['status'] },
    { fields: ['createdAt'] }
  ]
});

// ============================================================================
// RELATIONSHIPS
// ============================================================================

// Asset has many Offers
Asset.hasMany(Offer, { foreignKey: 'assetId', as: 'offers' });
Offer.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });

// Offer has one Escrow
Offer.hasOne(Escrow, { foreignKey: 'offerId', as: 'escrow' });
Escrow.belongsTo(Offer, { foreignKey: 'offerId', as: 'offer' });

// Asset has many Escrows
Asset.hasMany(Escrow, { foreignKey: 'assetId', as: 'escrows' });
Escrow.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });

// Asset has many Transaction Logs
Asset.hasMany(TransactionLog, { foreignKey: 'relatedAssetId', as: 'transactions' });
TransactionLog.belongsTo(Asset, { foreignKey: 'relatedAssetId', as: 'asset' });

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  sequelize,
  Asset,
  Offer,
  Escrow,
  Proof,
  TransactionLog,
  
  // Helper function to sync database
  async syncDatabase(force = false) {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established successfully');
      
      if (force) {
        console.warn('⚠️  Force syncing database (will drop all tables!)');
      }
      
      await sequelize.sync({ force, alter: !force });
      console.log('✅ Database synchronized');
      
      return true;
    } catch (error) {
      console.error('❌ Unable to connect to database:', error);
      throw error;
    }
  },
  
  // Close database connection
  async closeDatabase() {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
};
