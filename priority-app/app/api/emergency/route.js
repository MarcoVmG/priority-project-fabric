
import { submitTransaction } from "../gateway";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export async function POST(req) {
  const token = req.headers.get("Authorization")?.split(" ")[1]; // Extract the Bearer token
  if (!token) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }
  try{
    const body = await req.json();
    const {emergencyCode} = body;
    const JWT_SECRET = process.env.JWT_SECRET || "default_secret";
    const decoded = jwt.verify(token, JWT_SECRET);
    const userEmail = decoded.email;
    console.log('Emergency code:', emergencyCode);

    const rawUser = await submitTransaction("QueryByEmergencyCode", userEmail, emergencyCode);

    const userParsed = JSON.parse(rawUser);

    return new Response(
      JSON.stringify(userParsed),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error){
    console.error(error);
    return new Response(
      JSON.stringify({ message: 'Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
}

