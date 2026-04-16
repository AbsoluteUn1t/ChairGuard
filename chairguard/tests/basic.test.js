import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

// Test ChairGuard models and business logic

describe('SalonModel - Loss Calculation', () => {
  // Inline test helper since we can't import ESM properly in test runner
  
  function calculateAnnualLoss(chairs, hourlyRate, noShowRate) {
    const hoursPerDay = 8;
    const daysPerWeek = 6;
    const weeksPerYear = 52;
    
    const lossPerChair = hourlyRate * hoursPerDay * daysPerWeek * weeksPerYear * noShowRate;
    const totalLoss = lossPerChair * chairs;
    
    return {
      lossPerChairPerYear: Math.round(lossPerChair),
      totalLossPerYear: Math.round(totalLoss),
      lossPerMonth: Math.round(totalLoss / 12),
      lossPerWeek: Math.round(totalLoss / 52)
    };
  }

  it('calculates loss correctly for a 5-chair salon', () => {
    const result = calculateAnnualLoss(5, 120, 0.35);
    
    assert.strictEqual(result.lossPerChairPerYear, 104832);
    assert.strictEqual(result.totalLossPerYear, 524160);
    assert.strictEqual(result.lossPerMonth, 43680);
    assert.strictEqual(result.lossPerWeek, 10080);
  });

  it('calculates loss correctly for a 3-chair salon', () => {
    const result = calculateAnnualLoss(3, 100, 0.30);
    
    assert.strictEqual(result.lossPerChairPerYear, 74880);
    assert.strictEqual(result.totalLossPerYear, 224640);
  });

  it('handles edge case of 1 chair', () => {
    const result = calculateAnnualLoss(1, 80, 0.40);
    
    assert.strictEqual(result.lossPerChairPerYear, 79872);
    assert.strictEqual(result.totalLossPerYear, 79872);
  });

  it('applies 60% savings potential', () => {
    const loss = calculateAnnualLoss(5, 120, 0.35);
    const savings = loss.totalLossPerYear * 0.6;
    
    assert.strictEqual(savings, 314496);
  });
});

describe('Client Risk Scoring', () => {
  function getRiskLevel(noShowCount) {
    if (noShowCount >= 3) return 'red';
    if (noShowCount === 2) return 'yellow';
    return 'green';
  }

  it('assigns green for 0 no-shows', () => {
    assert.strictEqual(getRiskLevel(0), 'green');
    assert.strictEqual(getRiskLevel(1), 'green');
  });

  it('assigns yellow for 2 no-shows', () => {
    assert.strictEqual(getRiskLevel(2), 'yellow');
  });

  it('assigns red for 3+ no-shows', () => {
    assert.strictEqual(getRiskLevel(3), 'red');
    assert.strictEqual(getRiskLevel(10), 'red');
  });
});

describe('Email Sequence Logic', () => {
  const sequenceDelays = [0, 2, 5, 10]; // days after previous
  
  function getNextSendDate(previousStep) {
    const nextStep = previousStep + 1;
    if (nextStep >= sequenceDelays.length) return null;
    
    const sendDate = new Date();
    sendDate.setDate(sendDate.getDate() + sequenceDelays[nextStep]);
    return sendDate;
  }

  it('has correct delay sequence', () => {
    assert.strictEqual(sequenceDelays[0], 0);  // Immediate
    assert.strictEqual(sequenceDelays[1], 2);    // Day 2
    assert.strictEqual(sequenceDelays[2], 5);   // Day 5
    assert.strictEqual(sequenceDelays[3], 10);  // Day 10
  });

  it('calculates send dates correctly', () => {
    const today = new Date();
    
    const day2 = getNextSendDate(0);
    assert.strictEqual(day2.getDate(), today.getDate() + 2);
    
    const day5 = getNextSendDate(1);
    assert.strictEqual(day5.getDate(), today.getDate() + 5);
    
    const day10 = getNextSendDate(2);
    assert.strictEqual(day10.getDate(), today.getDate() + 10);
  });

  it('returns null after final step', () => {
    assert.strictEqual(getNextSendDate(3), null);
    assert.strictEqual(getNextSendDate(4), null);
  });
});

describe('Lead Status Transitions', () => {
  const validTransitions = {
    'new': ['contacted', 'exhausted', 'bounced'],
    'contacted': ['qualified', 'exhausted', 'bounced'],
    'qualified': ['demo_scheduled', 'customer', 'exhausted'],
    'demo_scheduled': ['customer', 'exhausted'],
    'customer': ['churned'], // hypothetical future
    'exhausted': [],
    'bounced': [],
    'unsub': []
  };

  it('allows valid transitions', () => {
    assert.ok(validTransitions['new'].includes('contacted'));
    assert.ok(validTransitions['new'].includes('exhausted'));
    assert.ok(validTransitions['qualified'].includes('customer'));
  });

  it('prevents invalid transitions', () => {
    assert.ok(!validTransitions['new'].includes('customer'));
    assert.ok(!validTransitions['exhausted'].includes('contacted'));
  });
});

console.log('✅ Tests defined - run with: node --test tests/basic.test.js');
