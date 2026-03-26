describe('Comment', function () {

    // Construction
    describe('constructor', function () {

        it('should initialize properties from value', function () {
            const c = new Comment('  Test comment  ');
            assert.equal(c.type, 'Comment');
            assert.equal(c.value, 'Test comment');
        });
    });
});