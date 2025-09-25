import express from 'express';
import { SaaSKnowledgeBase } from '../ai/saas-knowledge-base';

const router = express.Router();

// GET /saas/benchmarks - Get industry benchmarks
router.get('/benchmarks', (req, res) => {
  try {
    const { targetMarket } = req.query;
    const market = (targetMarket as string) || 'smb';
    
    const benchmarks = {
      churnRates: SaaSKnowledgeBase.BENCHMARKS.churnRates[market as keyof typeof SaaSKnowledgeBase.BENCHMARKS.churnRates] || SaaSKnowledgeBase.BENCHMARKS.churnRates.smb,
      magicNumbers: SaaSKnowledgeBase.BENCHMARKS.magicNumbers,
      cacPaybackPeriod: SaaSKnowledgeBase.BENCHMARKS.cacPaybackPeriod[market as keyof typeof SaaSKnowledgeBase.BENCHMARKS.cacPaybackPeriod] || SaaSKnowledgeBase.BENCHMARKS.cacPaybackPeriod.smb,
      nrr: SaaSKnowledgeBase.BENCHMARKS.nrr
    };

    return res.json({
      success: true,
      data: benchmarks,
      targetMarket: market
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch benchmarks',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /saas/calculate-metrics - Calculate SaaS metrics
router.post('/calculate-metrics', (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required'
      });
    }

    const metrics = SaaSKnowledgeBase.calculateMetrics(data);
    const recommendations = SaaSKnowledgeBase.getRecommendations(metrics, {
      type: 'hybrid',
      pricingModel: 'tiered',
      _targetMarket: 'mid-market',
      growthStrategy: 'hybrid'
    });

    return res.json({
      success: true,
      data: {
        metrics,
        recommendations
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /saas/financial-health - Calculate financial health score
router.post('/financial-health', (req, res) => {
  try {
    const { metrics } = req.body;
    
    if (!metrics) {
      return res.status(400).json({
        success: false,
        error: 'Metrics are required'
      });
    }

    const health = SaaSKnowledgeBase.calculateFinancialHealth(metrics);

    return res.json({
      success: true,
      data: health
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate financial health',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /saas/gtm-strategy - Generate go-to-market strategy
router.get('/gtm-strategy', (req, res) => {
  try {
    const { category, targetMarket, businessModel } = req.query;
    
    if (!category || !targetMarket || !businessModel) {
      return res.status(400).json({
        success: false,
        error: 'Category, targetMarket, and businessModel are required'
      });
    }

    const strategy = SaaSKnowledgeBase.generateGTMStrategy(
      category as string,
      targetMarket as string,
      businessModel as string
    );

    return res.json({
      success: true,
      data: strategy
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to generate GTM strategy',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /saas/pricing-strategy - Generate pricing strategy
router.get('/pricing-strategy', (req, res) => {
  try {
    const { category, targetMarket, businessModel } = req.query;
    
    if (!category || !targetMarket || !businessModel) {
      return res.status(400).json({
        success: false,
        error: 'Category, targetMarket, and businessModel are required'
      });
    }

    const strategy = SaaSKnowledgeBase.generatePricingStrategy(
      category as string,
      targetMarket as string,
      businessModel as string
    );

    return res.json({
      success: true,
      data: strategy
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to generate pricing strategy',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /saas/customer-success - Get customer success framework
router.get('/customer-success', (req, res) => {
  try {
    const { targetMarket } = req.query;
    
    if (!targetMarket) {
      return res.status(400).json({
        success: false,
        error: 'Target market is required'
      });
    }

    const framework = SaaSKnowledgeBase.getCustomerSuccessFramework(targetMarket as string);

    return res.json({
      success: true,
      data: framework
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to get customer success framework',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /saas/competition - Analyze competition
router.get('/competition', (req, res) => {
  try {
    const { category, targetMarket } = req.query;
    
    if (!category || !targetMarket) {
      return res.status(400).json({
        success: false,
        error: 'Category and target market are required'
      });
    }

    const analysis = SaaSKnowledgeBase.analyzeCompetition(
      category as string,
      targetMarket as string
    );

    return res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze competition',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /saas/market-insights - Get market insights
router.get('/market-insights', (req, res) => {
  try {
    const { category } = req.query;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Category is required'
      });
    }

    const insights = SaaSKnowledgeBase.analyzeMarket(category as string);

    return res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to get market insights',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /saas/business-models - Get business model information
router.get('/business-models', (req, res) => {
  try {
    const { type } = req.query;
    
    if (type) {
      const model = SaaSKnowledgeBase.BUSINESS_MODELS[type as keyof typeof SaaSKnowledgeBase.BUSINESS_MODELS];
      if (!model) {
        return res.status(404).json({
          success: false,
          error: 'Business model not found'
        });
      }
      
      return res.json({
        success: true,
        data: model
      });
    } else {
      return res.json({
        success: true,
        data: SaaSKnowledgeBase.BUSINESS_MODELS
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to get business models',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /saas/pricing-models - Get pricing model information
router.get('/pricing-models', (req, res) => {
  try {
    const { type } = req.query;
    
    if (type) {
      const model = SaaSKnowledgeBase.PRICING_MODELS[type as keyof typeof SaaSKnowledgeBase.PRICING_MODELS];
      if (!model) {
        return res.status(404).json({
          success: false,
          error: 'Pricing model not found'
        });
      }
      
      return res.json({
        success: true,
        data: model
      });
    } else {
      return res.json({
        success: true,
        data: SaaSKnowledgeBase.PRICING_MODELS
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to get pricing models',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /saas/growth-strategies - Get growth strategy information
router.get('/growth-strategies', (req, res) => {
  try {
    const { type } = req.query;
    
    if (type) {
      const strategy = SaaSKnowledgeBase.GROWTH_STRATEGIES[type as keyof typeof SaaSKnowledgeBase.GROWTH_STRATEGIES];
      if (!strategy) {
        return res.status(404).json({
          success: false,
          error: 'Growth strategy not found'
        });
      }
      
      return res.json({
        success: true,
        data: strategy
      });
    } else {
      return res.json({
        success: true,
        data: SaaSKnowledgeBase.GROWTH_STRATEGIES
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to get growth strategies',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
