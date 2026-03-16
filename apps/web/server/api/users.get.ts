import { users } from '#layer/server/database/schema'

export default defineEventHandler(async (event) => {
  const db = useDatabase(event)
  // Ensure the users table is accessible, verifying D1 and schema
  return await db.select().from(users).limit(5)
})
