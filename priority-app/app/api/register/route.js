import { submitTransaction } from "../gateway";// Import gateway logic
import bcrypt from 'bcrypt';

const saltRounds = 10;

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password, password2 } = body;
    //let idRetries = 5;
    let emCoRetries = 5;
    let emergencyCode = '';

    if (!email || !password || !password2) {
      return new Response(
        JSON.stringify({ message: "All fields are required!" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (password !== password2) {
      return new Response(
        JSON.stringify({ message: "Passwords do not match!" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    
    const id = `asset${Math.floor(Math.random() * 1000000)}`;
    

     //Generate a random emergency code
    while (emCoRetries > 0){
      emergencyCode = Math.random().toString(36).substring(2, 9);
      const exist = await submitTransaction("CheckEmrCodExist", email, emergencyCode);
      if (JSON.parse(exist.toString()) === false) {
        break;
      }
      emCoRetries--;
    }
    

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    // Call the Hyperledger Fabric transaction
    await submitTransaction("CreateUser", email, id, email, hashedPassword, emergencyCode);

    return new Response(
      JSON.stringify({ message: "User registered successfully!"}),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error during transaction:", error);
    return new Response(
      JSON.stringify({ message: "Something went wrong!" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

