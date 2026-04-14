//=============================================================================
// CommentTests.js
//
//=============================================================================
import { Comment } from './Comment.js';

describe('Comment', function () {

    // Construction
    describe('constructor', function () {

        it('should initialize properties from value', function () {
            const c = new Comment('  Test comment  ');
            assert.equal(c.type, 'Comment');
            assert.equal(c.value, 'Test comment');
        });

        it('should store an empty string as-is', function () {
            const c = new Comment('');
            assert.equal(c.value, '');
        });

        it('should trim a whitespace-only string to empty', function () {
            const c = new Comment('   ');
            assert.equal(c.value, '');
        });

        it('should preserve a hash comment line unchanged', function () {
            const c = new Comment('# Section header');
            assert.equal(c.type, 'Comment');
            assert.equal(c.value, '# Section header');
        });
    });
});