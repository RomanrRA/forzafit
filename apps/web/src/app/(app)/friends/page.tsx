import { redirect } from 'next/navigation'

export default function FriendsRedirectPage() {
  redirect('/social?tab=friends')
}
