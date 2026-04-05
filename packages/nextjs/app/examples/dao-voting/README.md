# DAO Voting Example (SimpleDao)

Steps:
1. Deploy with `yarn deploy` to create `SimpleDao` (1-person-1-vote by default).
2. Open `/examples/dao-voting` and connect your wallet.
3. The deployer (chair) can create a proposal (2-minute window in demo).
4. Any address can vote once. Yes wins if yesVotes > noVotes.
5. After the deadline, chair can execute to finalize the outcome.

Tip: For weighted voting, deploy `TokenDemo` first and pass its address to `SimpleDao` constructor (modify deploy script).

