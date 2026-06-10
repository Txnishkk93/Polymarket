import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient("https://gmlvrpqskhosmoftqiyo.supabase.co", process.env.SUPABASE_SECRET_KEY!)

export async function middleware(req: Request, res: Response, next: NextFunction) {

    const token = req.headers.authorization
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (error || !user) {
            res.status(403).json({message:"Incorrect credentials"})
            return
        }
        console.log(user)
        next()
    } catch (e) {
        res.status(403).json({message:"Incorrect credentials"})
    }
}