import { createClient } from '@supabase/supabase-js'
import { useUser } from './hooks/useUser';
import { useSupabase } from './hooks/useSupabase';
import axios from 'axios'

function App() {
  
  const { claims } = useUser()
  const supabase = useSupabase()
  return <div>

    {!claims && <button onClick={() => {
      supabase.auth.signInWithWeb3({
        chain: 'solana',
        statement: 'I accept the terms of service at https://example.com/tos',
      })
    }}>Sigin with web3</button>}

    {claims && <button onClick={async () => {
      supabase.auth.signOut()
    }}>logout</button>}
    {JSON.stringify(claims)}

    <button
      onClick={async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          alert("Please login first");
          return;
        }

        await axios.post(
          "http://localhost:3000/buy",
          {},
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );
      }}
    >
      Click Here
    </button>
  </div >
}

export default App
