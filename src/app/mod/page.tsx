import { supabase } from '@/lib/supabase'
import ModerationCard from '@/components/ModerationCard'

export default async function ModPage() {
const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('status', 'pending')

return (
    <main className="p-4">
    <h1 className="text-2xl font-bold mb-6">🛠 Moderation Dashboard</h1>
    <div className="space-y-10">
        {photos?.map(photo => (
        <ModerationCard key={photo.id} photo={photo} />
        ))}
    </div>
    </main>
)
}
