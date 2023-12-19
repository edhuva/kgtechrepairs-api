const Note = require('../models/Note');
const User = require('../models/User');

//@desc Get all notes
//@desc GET /notes
//@access Private
const getAllNotes = async (req, res) => {
    // Get all notes from MongoDB
   const notes = await Note.find().lean();

   // If no notes
   if (!notes?.length) {
    return res.status(400).json({ message: 'No notes found' });
   }

   // Add username to each note before sending the response
   const notesWithUsers = await Promise.all(notes.map(async (note) => {
    //const user = await User.findById(note.user).lean().exec();
    const userCreated = await User.findById(note.userCreated).lean().exec();
    const userAssigned = await User.findById(note.userAssigned).lean().exec();
    return { ...note, userCreated: userCreated.username, userAssigned: userAssigned.username };
    //, userCreated: userCreated.username
   }))
   res.json(notesWithUsers);
};

//@desc create new note
//@desc POST /notes
//@access Private
const createNewNote = async (req, res) => {
    const { userCreated, userAssigned, title, text } = req.body;
    
    //Confirm data
    if (!userCreated || !userAssigned || !title || !text) {
        return res.status(400).json({message: 'All fields are required'})
    }

    // Check for duplicate title
    const duplicate = await Note.findOne({ title }).collation({ locale: 'en', strength: 2 }).lean().exec();

    if (duplicate) {
        return res.status(409).json({ message: 'Duplicate note title' });
    }

    // Create and store the new note
    const note = await Note.create({ userCreated, userAssigned, title, text });

    if (note) {
        // Created
        return res.status(201).json({ message: 'New note created' });
    } else {
        return res.status(400).json({ message: 'Invalid note data received ' });
    }
};

//@desc update note
//@desc PATCH /notes
//@access Private
const updateNote = async (req, res) => {
    const { id, userAssigned, title, text, completed } = req.body;

    // Confirm data
    if (!id || !userAssigned || !title || !text || typeof completed !== 'boolean') {
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Confirm note exists to update
    const note = await Note.findById(id).exec();

    if (!note) {
        return res.status(400).json({ message: 'Note not found' });
    }

    // Check for duplicate title 
    const duplicate = await Note.findOne({ title }).collation({ locale: 'en', strength: 2 }).lean().exec();

    // Allow renaming of the original note
    if (duplicate && duplicate?._id.toString() !== id) {
        return res.status(409).json({ message: 'Duplicate note title' });
    }

    //note.userCreated = userCreated;
    note.userAssigned = userAssigned;
    note.title = title;
    note.text = text;
    note.completed = completed;

    const updatedNote = await note.save();
    res.json(`'${updatedNote.title}' updated`);
};

//@desc delete note
//@desc DELETE /notes
//@access Private
const deleteNote = async (req, res) => {
    const { id } = req.body;

    //Confirm data
    if (!id) {
        return res.status(400).json({ message: 'Note ID required' });
    }

    //confirm note exists to delete
    const note = await Note.findById(id).exec();

    if (!note) {
        return res.status(400).json({ message: 'Note not found' })
    }

    const result = await note.deleteOne();
    const reply = `Note '${note.title}' with ID ${ note._id } deleted`;

    res.json(reply);
}

module.exports = {
    getAllNotes,
    createNewNote,
    updateNote,
    deleteNote,
}