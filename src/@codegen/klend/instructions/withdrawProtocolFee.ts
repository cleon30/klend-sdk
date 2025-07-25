/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Address,
  isSome,
  IAccountMeta,
  IAccountSignerMeta,
  IInstruction,
  Option,
  TransactionSigner,
} from "@solana/kit"
/* eslint-enable @typescript-eslint/no-unused-vars */
import BN from "bn.js" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as borsh from "@coral-xyz/borsh" // eslint-disable-line @typescript-eslint/no-unused-vars
import { borshAddress } from "../utils" // eslint-disable-line @typescript-eslint/no-unused-vars
import * as types from "../types" // eslint-disable-line @typescript-eslint/no-unused-vars
import { PROGRAM_ID } from "../programId"

export interface WithdrawProtocolFeeArgs {
  amount: BN
}

export interface WithdrawProtocolFeeAccounts {
  globalConfig: Address
  lendingMarket: Address
  reserve: Address
  reserveLiquidityMint: Address
  lendingMarketAuthority: Address
  feeVault: Address
  feeCollectorAta: Address
  tokenProgram: Address
}

export const layout = borsh.struct([borsh.u64("amount")])

export function withdrawProtocolFee(
  args: WithdrawProtocolFeeArgs,
  accounts: WithdrawProtocolFeeAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.lendingMarket, role: 0 },
    { address: accounts.reserve, role: 0 },
    { address: accounts.reserveLiquidityMint, role: 0 },
    { address: accounts.lendingMarketAuthority, role: 0 },
    { address: accounts.feeVault, role: 1 },
    { address: accounts.feeCollectorAta, role: 1 },
    { address: accounts.tokenProgram, role: 0 },
  ]
  const identifier = Buffer.from([158, 201, 158, 189, 33, 93, 162, 103])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      amount: args.amount,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
