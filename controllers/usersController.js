const User = require('../models/User');
const Note = require('../models/Note');
const bcrypt = require('bcrypt');

//@desc Get all users
//@desc GET /users
//@access Private
const getAllUsers = async (req, res) => {
    // Get all users from MongoDB
    const users = await User.find().select('-password').lean();
    
    // If no users
    if (!users?.length) {
        return res.status(400).json({ message: 'No users found' });
    }

    res.json(users);
}

//@desc Create new user
//@desc POST /users
//@access Private
const createUser = async (req, res) => {
    const { username, password, roles } = req.body;

    //confirm data
    if (!username || !password) {
        return res.status(400).json({ message: 'All fields are required' })
    }
    
    //check for duplicate
    const duplicate = await User.findOne({ username }).collation({ locale: 'en', strength: 2 }).lean().exec();

    if (duplicate) {
        return res.status(409).json({ message: 'Duplicate username' });
    }

    //Hash password
    const hashedPwd = await bcrypt.hash(password, 10) //salt rounds

    const userObject = (!Array.isArray(roles) || !roles.length)
        ? { username, "password": hashedPwd }
        : { username, "password": hashedPwd, roles }

    //create and store new user
    const user = await User.create(userObject);

    if (user) {
        res.status(201).json({ message: `New user ${username} created` })
    } else {
        res.status(400).json({ message: 'Invalid user data received' })
    }
}

//@desc Update user
//@desc PATCH /users
//@access Private
const updateUser = async (req, res) => {
    const { id, username, roles, active, password } = req.body;

    //confirm data
    if (!id || !username || !Array.isArray(roles) || !roles.length || typeof active !== 'boolean')
    {
        return res.status(400).json({ message: 'All fields except password are required' });
    }

    // Does the user exwist to update?
    const user = await User.findById(id).exec();

    if (!user) {
        return res.status(400).json({ message: 'User not found' });
    }

    // Check for duplicates
    const duplicate = await User.findOne({ username }).collation({ locale: 'en', strength: 2 }).lean().exec();

    //allow updates to the original user
    if (duplicate && duplicate?._id.toString() !== id) {
        return res.status(409).json({ message: 'Duplicate username' });
    }

    user.username = username;
    user.roles = roles;
    user.active = active;

    if(password) {
        //hash password
        user.password = await bcrypt.hash(password, 10); // salt rounds
    }

    const updatedUser  = await user.save();

    res.json({ message: `${ updatedUser.username } updated` });
}

//@desc Delete user
//@desc DELETE /users
//@access Private
const deleteUser = async (req, res) => {
    const { id } = req.body;

    // Confirm data
    if (!id) {
        return res.status(400).json({ message: 'User ID Required' });
    }

    // Does the user still have assigned notes?
    const note = await Note.findOne({ user: id }).lean().exec();
    if (note) {
        return res.status(400).json({ message: 'User has assigned notes' });
    }

    // Does the user exist to delete?
    const user = await User.findById(id).exec();

    if (!user) {
        return res.status(400).json({ message: 'User not found' });
    }

    const result = await user.deleteOne();
    const reply = `Username ${user.username} with  ID ${user._id} deleted`;
    
    res.json(reply);
}

module.exports = {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
}