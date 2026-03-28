//=============================================================================
// Comment.js
//
// A class representing a single in the dataset file.
//=============================================================================
export class Comment {
    constructor(value) {
        this.type = "Comment";
        this.value = value.trim();
    }
}