import assert from 'assert';
import { km, nearest } from '../src/lib/geo.js';

const index = {
  data: [
    { path: '/us/en/adventures/tahoe-skiing', title: 'Tahoe Skiing', image: 't.jpg' },
    { path: '/us/en/adventures/bali-surf-camp', title: 'Bali Surf Camp', image: 'b.jpg' },
    { path: '/us/en/adventures/gastronomic-marais-tour', title: 'Gastronomic Marais Tour', image: 'g.jpg' },
    { path: '/us/en/magazine/ski-touring', title: 'Ski Touring article', image: 'm.jpg' },
    { path: '/us/en/adventures/unknown-trip', title: 'Unknown', image: 'u.jpg' },
  ],
};

describe('geo helpers', () => {
  it('measures distance in km', () => {
    const paris = [48.86, 2.35];
    const london = [51.51, -0.13];
    const d = km(paris, london);
    assert.ok(d > 330 && d < 360, `Paris–London should be ~344 km, got ${d}`);
  });

  it('returns 0 km for the same point', () => {
    assert.equal(Math.round(km([10, 10], [10, 10])), 0);
  });

  it('puts the closest adventure first', () => {
    const paris = [48.86, 2.35];
    const result = nearest(index, paris);
    assert.equal(result[0].title, 'Gastronomic Marais Tour');
  });

  it('only returns known adventure pages', () => {
    const result = nearest(index, [0, 0], 10);
    assert.equal(result.length, 3);
    assert.ok(result.every((a) => a.path.includes('/adventures/')));
    assert.ok(!result.some((a) => a.title === 'Unknown'));
  });
});
