import { createClient } from '@supabase/supabase-js'
import { useEffect, useState } from 'react';
import { useSupabase } from './useSupabase';

export function useUser() {

    const [claims, setClaims] = useState(null);
    const supabase = useSupabase()

    useEffect(() => {
        supabase.auth.getClaims().then((response) => {
            if (response?.data?.claims) {
                setClaims(response.data.claims)
            } else {
                setClaims(null)
            }
        }).catch((error) => {
            console.error('Failed to get claims:', error)
            setClaims(null)
        })
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            supabase.auth.getClaims().then((response) => {
                if (response?.data?.claims) {
                    setClaims(response.data.claims)
                } else {
                    setClaims(null)
                }
            }).catch((error) => {
                console.error('Failed to get claims on auth change:', error)
                setClaims(null)
            })
        })
        return () => subscription.unsubscribe()
    }, [])
    return {claims}
}