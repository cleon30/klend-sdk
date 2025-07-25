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

export interface TransferAdminArgs {
  params: types.TransferAdminParamsFields
}

export interface TransferAdminAccounts {
  admin: TransactionSigner
  newAdmin: Address
  perpetuals: Address
}

export const layout = borsh.struct([types.TransferAdminParams.layout("params")])

export function transferAdmin(
  args: TransferAdminArgs,
  accounts: TransferAdminAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.admin.address, role: 3, signer: accounts.admin },
    { address: accounts.newAdmin, role: 0 },
    { address: accounts.perpetuals, role: 1 },
  ]
  const identifier = Buffer.from([42, 242, 66, 106, 228, 10, 111, 156])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      params: types.TransferAdminParams.toEncodable(args.params),
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
