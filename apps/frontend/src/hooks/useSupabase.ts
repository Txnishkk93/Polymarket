import { useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

export function useSupabase() {
    const supabase = useMemo(() => 
        createClient("https://gmlvrpqskhosmoftqiyo.supabase.co", "sb_publishable_bTz_dygR_hZbAuEDAylyHQ_6Yp05BIv"),
        []
    )
    return supabase;
}