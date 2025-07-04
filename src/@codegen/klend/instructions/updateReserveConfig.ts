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

export interface UpdateReserveConfigArgs {
  mode: types.UpdateConfigModeKind
  value: Uint8Array
  skipConfigIntegrityValidation: boolean
}

export interface UpdateReserveConfigAccounts {
  signer: TransactionSigner
  globalConfig: Address
  lendingMarket: Address
  reserve: Address
}

export const layout = borsh.struct([
  types.UpdateConfigMode.layout("mode"),
  borsh.vecU8("value"),
  borsh.bool("skipConfigIntegrityValidation"),
])

export function updateReserveConfig(
  args: UpdateReserveConfigArgs,
  accounts: UpdateReserveConfigAccounts,
  programAddress: Address = PROGRAM_ID
) {
  const keys: Array<IAccountMeta | IAccountSignerMeta> = [
    { address: accounts.signer.address, role: 2, signer: accounts.signer },
    { address: accounts.globalConfig, role: 0 },
    { address: accounts.lendingMarket, role: 0 },
    { address: accounts.reserve, role: 1 },
  ]
  const identifier = Buffer.from([61, 148, 100, 70, 143, 107, 17, 13])
  const buffer = Buffer.alloc(1000)
  const len = layout.encode(
    {
      mode: args.mode.toEncodable(),
      value: Buffer.from(
        args.value.buffer,
        args.value.byteOffset,
        args.value.length
      ),
      skipConfigIntegrityValidation: args.skipConfigIntegrityValidation,
    },
    buffer
  )
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len)
  const ix: IInstruction = { accounts: keys, programAddress, data }
  return ix
}
