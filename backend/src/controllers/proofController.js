const proofService = require('../services/proofService');
const logger = require('../utils/logger');
const proofs = new Map();

exports.generateOwnershipProof = async (req, res, next) => {
  try {
    const { assetId, ownerAddress } = req.body;
    const proof = await proofService.generateOwnershipProof({ assetId, ownerAddress });
    const proofData = { id: `proof_${Date.now()}`, type: 'ownership', proof, assetId, ownerAddress, createdAt: new Date().toISOString() };
    proofs.set(proofData.id, proofData);
    res.status(201).json({ success: true, proof: proofData });
  } catch (error) { logger.error('Error generating ownership proof', { error: error.message }); next(error); }
};

exports.generateAccreditationProof = async (req, res, next) => {
  try {
    const { investorData } = req.body;
    const proof = await proofService.generateAccreditationProof(investorData);
    const proofData = { id: `proof_${Date.now()}`, type: 'accreditation', proof, createdAt: new Date().toISOString() };
    proofs.set(proofData.id, proofData);
    res.status(201).json({ success: true, proof: proofData });
  } catch (error) { next(error); }
};

exports.generateJurisdictionProof = async (req, res, next) => {
  try {
    const { location } = req.body;
    const proof = await proofService.generateJurisdictionProof(location);
    const proofData = { id: `proof_${Date.now()}`, type: 'jurisdiction', proof, location, createdAt: new Date().toISOString() };
    proofs.set(proofData.id, proofData);
    res.status(201).json({ success: true, proof: proofData });
  } catch (error) { next(error); }
};

exports.verifyProof = async (req, res, next) => {
  try {
    const { proof } = req.body;
    const verified = await proofService.verifyProof(proof);
    res.json({ success: true, verified });
  } catch (error) { next(error); }
};

exports.batchVerifyProofs = async (req, res, next) => {
  try {
    const { proofs: proofsToVerify } = req.body;
    const verified = await proofService.verifyProofs(proofsToVerify);
    res.json({ success: true, verified, count: proofsToVerify.length });
  } catch (error) { next(error); }
};

exports.getProof = async (req, res, next) => {
  try {
    const { id } = req.params;
    const proof = proofs.get(id);
    if (!proof) return res.status(404).json({ success: false, error: 'Proof not found' });
    res.json({ success: true, proof });
  } catch (error) { next(error); }
};

exports.getUserProofs = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const userProofs = Array.from(proofs.values()).filter(p => p.ownerAddress === userId);
    res.json({ success: true, proofs: userProofs, count: userProofs.length });
  } catch (error) { next(error); }
};

exports.deleteProof = async (req, res, next) => {
  try {
    const { id } = req.params;
    proofs.delete(id);
    res.json({ success: true, message: 'Proof deleted' });
  } catch (error) { next(error); }
};

module.exports = exports;
