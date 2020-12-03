const cryptoHash = require('./cryptoHash');

describe('cryptoHash()', () => {
    it('generates a SHA-256 hashed output', () => {
        expect(cryptoHash('test-string'))
            .toEqual('e56af389d6a4c7188435c750e91240f1e020297ef7540bbe3a0d7ccb65af4f89');
    });

    it('produces the same hash with same inputs in any order', () => {
        expect(cryptoHash('one', 'two', 'three'))
            .toEqual(cryptoHash('three', 'one', 'two'));
    });

    it('produces a unique hash when the properties have changed on an input', () => {
        const foo = {};
        const originalHash = cryptoHash(foo);
        foo['a'] = 'a';
        
        expect(cryptoHash(foo)).not.toEqual(originalHash);
    });
});