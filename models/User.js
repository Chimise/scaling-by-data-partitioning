import mongoose from "mongoose";
import {toJSONPlugin} from './plugins/index.js';

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    location: {
        city: String,
        state: String,
        country: String,
    },
    gender: String,
    email: {
        type: String,
        required: true
    },
    dob: {
        type: Date,
        required: true
    },
    picture: String
})

toJSONPlugin(UserSchema);


export default mongoose.model('User', UserSchema);