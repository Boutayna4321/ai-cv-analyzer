const Stripe = require('stripe');
const User = require('../models/User');
const Payment = require('../models/Payment');

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: '2024-06-20' })
  : null;

exports.createCheckoutSession = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        success: false,
        message: 'Stripe n’est pas configuré'
      });
    }

    const { planType } = req.body;
    if (planType !== 'premium') {
      return res.status(400).json({
        success: false,
        message: 'Type de plan invalide'
      });
    }

    let customerId = req.user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: { userId: req.user.id.toString() }
      });
      customerId = customer.id;

      await User.findByIdAndUpdate(req.user.id, {
        stripeCustomerId: customerId
      });
    }

    const price = parseInt(process.env.STRIPE_MONTHLY_PRICE || '9900', 10);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'mad',
          product_data: {
            name: 'AI CV Analyzer - Premium',
            description: 'Analyses illimitées avec IA'
          },
          unit_amount: price,
          recurring: {
            interval: 'month'
          }
        },
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing?payment=cancelled`,
      metadata: { userId: req.user.id.toString() }
    });

    await Payment.create({
      userId: req.user.id,
      stripeCustomerId: customerId,
      stripeSessionId: session.id,
      plan: 'premium',
      status: 'pending',
      amount: price,
      currency: 'mad'
    });

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });
  } catch (error) {
    console.error('Erreur création session Stripe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la session de paiement'
    });
  }
};

exports.handleWebhook = async (req, res) => {
  if (!stripe) {
    return res.status(500).json({
      success: false,
      message: 'Stripe n’est pas configuré'
    });
  }

  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await Payment.findOneAndUpdate(
          { stripeSessionId: session.id },
          { status: 'paid' }
        );
        await User.findByIdAndUpdate(session.metadata.userId, {
          planType: 'premium',
          analysesCount: 0
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const user = await User.findOne({ stripeCustomerId: subscription.customer });
        if (user) {
          user.planType = 'free';
          user.analysesCount = 0;
          await user.save();
        }
        break;
      }
      default:
        console.log(`Événement Stripe ignoré: ${event.type}`);
    }
  } catch (error) {
    console.error('Erreur traitement webhook:', error);
    return res.status(500).json({ received: false });
  }

  res.json({ received: true });
};

exports.getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      data: {
        planType: user.planType,
        analysesCount: user.analysesCount,
        canAnalyze: user.canAnalyze()
      }
    });
  } catch (error) {
    console.error('Erreur statut abonnement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du statut'
    });
  }
};
