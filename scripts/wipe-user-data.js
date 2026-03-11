// scripts/wipe-user-data.js
// Run with: mongosh "your-connection-string" scripts/wipe-user-data.js
// WARNING: This wipes all user-related data. Organizations are preserved.

print("=== Condo Agora: Wipe User Data for Clerk Removal ===");
print("Collections to wipe: users, organization_members, invitations, houses");
print("Collections preserved: organizations");

const dbName = "condo_agora";
const database = db.getSiblingDB(dbName);

print("Dropping users: " + database.users.countDocuments() + " docs");
database.users.drop();

print("Dropping organization_members: " + database.organization_members.countDocuments() + " docs");
database.organization_members.drop();

print("Dropping invitations: " + database.invitations.countDocuments() + " docs");
database.invitations.drop();

print("Dropping houses: " + database.houses.countDocuments() + " docs");
database.houses.drop();

// Drop any voting/proposal data that references users
if (database.getCollectionNames().includes("votes")) {
    print("Dropping votes: " + database.votes.countDocuments() + " docs");
    database.votes.drop();
}
if (database.getCollectionNames().includes("proposals")) {
    print("Dropping proposals: " + database.proposals.countDocuments() + " docs");
    database.proposals.drop();
}

// Drop OTP and rate limit collections (new auth system)
if (database.getCollectionNames().includes("otp_codes")) {
    database.otp_codes.drop();
}
if (database.getCollectionNames().includes("rate_limits")) {
    database.rate_limits.drop();
}

print("Done. Organizations preserved: " + database.organizations.countDocuments());
print("Run the app to recreate indexes automatically.");
