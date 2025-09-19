const KYC = require('../models/KYC');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'uploads/kyc/';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

/**
 * Submit KYC information
 */
async function submitKYC(req, res) {
  try {
    let { personalInfo, documentType } = req.body;
    const userId = req.user.userId; // Get user ID from JWT token

    console.log('📋 KYC Submit Backend: Raw personalInfo:', personalInfo);
    console.log('📋 KYC Submit Backend: Document type:', documentType);

    // Parse personalInfo if it's a JSON string
    if (typeof personalInfo === 'string') {
      try {
        personalInfo = JSON.parse(personalInfo);
        console.log('📋 KYC Submit Backend: Parsed personalInfo:', personalInfo);
      } catch (parseError) {
        console.error('❌ KYC Submit Backend: Failed to parse personalInfo:', parseError);
        return res.status(400).json({
          success: false,
          error: 'Invalid personalInfo format'
        });
      }
    }

    // Validate required fields for KYC submission
    if (!personalInfo || !documentType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: personalInfo and documentType'
      });
    }

    // Validate personal info required fields
    const requiredPersonalFields = ['firstName', 'lastName', 'dateOfBirth', 'address', 'city', 'postalCode', 'country'];
    const missingPersonalFields = requiredPersonalFields.filter(field => !personalInfo[field]);
    
    if (missingPersonalFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required personal information: ${missingPersonalFields.join(', ')}`
      });
    }

    // Check if files were uploaded
    if (!req.files || !req.files.frontImage) {
      return res.status(400).json({
        success: false,
        error: 'Front image is required'
      });
    }

    // For driving license and national ID, back image is required
    if ((documentType === 'driving_license' || documentType === 'national_id') && !req.files.backImage) {
      return res.status(400).json({
        success: false,
        error: 'Back image is required for this document type'
      });
    }

    // Check if KYC already exists for this user
    let existingKYC = await KYC.findOne({ userId });
    
    const kycData = {
      userId,
      personalInfo: {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        dateOfBirth: new Date(personalInfo.dateOfBirth),
        address: personalInfo.address,
        city: personalInfo.city,
        postalCode: personalInfo.postalCode,
        country: personalInfo.country
      },
      documentInfo: {
        type: documentType,
        frontImagePath: req.files.frontImage[0].path,
        backImagePath: req.files.backImage ? req.files.backImage[0].path : null
      },
      status: 'pending',
      submittedAt: new Date() // Set submission timestamp
    };

    let kyc;
    if (existingKYC) {
      // Update existing KYC
      kyc = await KYC.findByIdAndUpdate(existingKYC._id, kycData, { new: true });
    } else {
      // Create new KYC
      kyc = new KYC(kycData);
      await kyc.save();
    }

    // Update user's KYC reference
    await User.findByIdAndUpdate(userId, { kycId: kyc._id });

    res.json({
      success: true,
      message: 'KYC information submitted successfully',
      kycId: kyc._id
    });

  } catch (error) {
    console.error('KYC submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit KYC information'
    });
  }
}

/**
 * Get KYC status for a user
 */
async function getKYCStatus(req, res) {
  try {
    const userId = req.user.userId;

    const kyc = await KYC.findOne({ userId }).select('-documentInfo.frontImagePath -documentInfo.backImagePath');
    
    if (!kyc) {
      return res.json({
        success: true,
        kycStatus: 'notstarted',
        kyc: null
      });
    }

    res.json({
      success: true,
      kycStatus: kyc.status,
      kyc: {
        status: kyc.status,
        submittedAt: kyc.submittedAt,
        reviewedAt: kyc.reviewedAt,
        verificationNotes: kyc.verificationNotes
      }
    });

  } catch (error) {
    console.error('Get KYC status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get KYC status'
    });
  }
}

/**
 * Helper function to get KYC status by userId (for internal use)
 */
async function getKYCStatusByUserId(userId) {
  try {
    const kyc = await KYC.findOne({ userId });
    return kyc ? kyc.status : 'notstarted';
  } catch (error) {
    console.error('Get KYC status by userId error:', error);
    return 'notstarted';
  }
}

/**
 * Get all pending KYC submissions (Admin only)
 */
async function getPendingKYC(req, res) {
  try {
    // This would typically require admin authentication
    const pendingKYCs = await KYC.find({ status: 'pending' })
      .populate('userId', 'email fullName phoneNumber')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      kycs: pendingKYCs
    });

  } catch (error) {
    console.error('Get pending KYC error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending KYC submissions'
    });
  }
}

/**
 * Approve or reject KYC (Admin only)
 */
async function updateKYCStatus(req, res) {
  try {
    const { kycId, status, notes } = req.body;
    const reviewerId = req.user.userId; // Admin user ID

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const kyc = await KYC.findByIdAndUpdate(
      kycId,
      {
        status,
        verificationNotes: notes || '',
        reviewedAt: new Date(),
        reviewedBy: reviewerId
      },
      { new: true }
    );

    if (!kyc) {
      return res.status(404).json({
        success: false,
        error: 'KYC submission not found'
      });
    }

    // KYC status is now managed only in KYC model
    // User.kycId already references the KYC document

    res.json({
      success: true,
      message: `KYC ${status} successfully`,
      kyc
    });

  } catch (error) {
    console.error('Update KYC status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update KYC status'
    });
  }
}

module.exports = {
  submitKYC,
  getKYCStatus,
  getKYCStatusByUserId,
  getPendingKYC,
  updateKYCStatus,
  upload
};
