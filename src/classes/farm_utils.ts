import {
  Farms,
  FarmState,
  getUserStatePDA,
  UserState,
  FarmConfigOption,
  lamportsToCollDecimal,
  scaleDownWads,
  WAD,
} from '@kamino-finance/farms-sdk';
import {
  address,
  Address,
  fetchEncodedAccount,
  generateKeyPairSigner,
  IInstruction,
  Rpc,
  SolanaRpcApi,
  TransactionSigner,
} from '@solana/kit';
import Decimal from 'decimal.js/decimal';
import { DEFAULT_PUBLIC_KEY } from '../utils';
import { getScopePricesFromFarm } from '@kamino-finance/farms-sdk/dist/utils/option';

export const FARMS_GLOBAL_CONFIG_MAINNET: Address = address('6UodrBjL2ZreDy7QdR4YV1oxqMBjVYSEyrFpctqqwGwL');

export async function getFarmStakeIxs(
  rpc: Rpc<SolanaRpcApi>,
  user: TransactionSigner,
  lamportsToStake: Decimal,
  farmAddress: Address,
  fetchedFarmState?: FarmState
): Promise<IInstruction[]> {
  const farmState = fetchedFarmState ? fetchedFarmState : await FarmState.fetch(rpc, farmAddress);
  if (!farmState) {
    throw new Error(`Farm state not found for ${farmAddress}`);
  }

  const farmClient = new Farms(rpc);
  const scopePricesArg = getScopePricesFromFarm(farmState);

  const stakeIxs: IInstruction[] = [];
  const userState = await getUserStatePDA(farmClient.getProgramID(), farmAddress, user.address);
  const userStateExists = await fetchEncodedAccount(rpc, userState);
  if (!userStateExists.exists) {
    const createUserIx = await farmClient.createNewUserIx(user, farmAddress);
    stakeIxs.push(createUserIx);
  }

  const stakeIx = await farmClient.stakeIx(user, farmAddress, lamportsToStake, farmState.token.mint, scopePricesArg);
  stakeIxs.push(stakeIx);

  return stakeIxs;
}

export async function getFarmUserStatePDA(rpc: Rpc<SolanaRpcApi>, user: Address, farm: Address): Promise<Address> {
  const farmClient = new Farms(rpc);
  return getUserStatePDA(farmClient.getProgramID(), farm, user);
}

export async function getFarmUnstakeIx(
  rpc: Rpc<SolanaRpcApi>,
  user: TransactionSigner,
  lamportsToUnstake: Decimal,
  farmAddress: Address,
  fetchedFarmState?: FarmState
): Promise<IInstruction> {
  const farmState = fetchedFarmState ? fetchedFarmState : await FarmState.fetch(rpc, farmAddress);
  if (!farmState) {
    throw new Error(`Farm state not found for ${farmAddress}`);
  }

  const farmClient = new Farms(rpc);
  const scopePricesArg = getScopePricesFromFarm(farmState);
  const scaledLamportsToUnstake = lamportsToUnstake.floor().mul(WAD);
  return farmClient.unstakeIx(user, farmAddress, scaledLamportsToUnstake, scopePricesArg);
}

// withdrawing from a farm is a 2 step operation: first we unstake the tokens from the farm, then we withdraw them
export async function getFarmWithdrawUnstakedDepositIx(
  rpc: Rpc<SolanaRpcApi>,
  user: TransactionSigner,
  farm: Address,
  stakeTokenMint: Address
): Promise<IInstruction> {
  const farmClient = new Farms(rpc);
  const userState = await getUserStatePDA(farmClient.getProgramID(), farm, user.address);
  return farmClient.withdrawUnstakedDepositIx(user, userState, farm, stakeTokenMint);
}

export async function getFarmUnstakeAndWithdrawIxs(
  connection: Rpc<SolanaRpcApi>,
  user: TransactionSigner,
  lamportsToUnstake: Decimal,
  farmAddress: Address,
  fetchedFarmState?: FarmState
): Promise<UnstakeAndWithdrawFromFarmIxs> {
  const farmState = fetchedFarmState ? fetchedFarmState : await FarmState.fetch(connection, farmAddress);
  if (!farmState) {
    throw new Error(`Farm state not found for ${farmAddress}`);
  }

  const unstakeIx = await getFarmUnstakeIx(connection, user, lamportsToUnstake, farmAddress, farmState);
  const withdrawIx = await getFarmWithdrawUnstakedDepositIx(connection, user, farmAddress, farmState.token.mint);
  return { unstakeIx, withdrawIx };
}

export async function getSetupFarmIxsWithFarm(
  connection: Rpc<SolanaRpcApi>,
  farmAdmin: TransactionSigner,
  farmTokenMint: Address
): Promise<SetupFarmIxsWithFarm> {
  const farmClient = new Farms(connection);
  const farm = await generateKeyPairSigner();
  const ixs = await farmClient.createFarmIxs(farmAdmin, farm, FARMS_GLOBAL_CONFIG_MAINNET, farmTokenMint);
  return { farm, setupFarmIxs: ixs };
}

/**
 * Returns the number of tokens the user has staked in the farm
 * @param connection - the connection to the cluster
 * @param user - the user's public key
 * @param farm - the farm's public key
 * @param farmTokenDecimals - the decimals of the farm token
 * @returns the number of tokens the user has staked in the farm
 */
export async function getUserSharesInTokensStakedInFarm(
  rpc: Rpc<SolanaRpcApi>,
  user: Address,
  farm: Address,
  farmTokenDecimals: number
): Promise<Decimal> {
  const farmClient = new Farms(rpc);
  const userStatePDA = await getUserStatePDA(farmClient.getProgramID(), farm, user);
  // if the user state does not exist, return 0
  const userState = await fetchEncodedAccount(rpc, userStatePDA);
  if (!userState.exists) {
    return new Decimal(0);
  }

  // if the user state exists, return the user shares
  return farmClient.getUserTokensInUndelegatedFarm(user, farm, farmTokenDecimals);
}

export async function setVaultIdForFarmIx(
  rpc: Rpc<SolanaRpcApi>,
  farmAdmin: TransactionSigner,
  farm: Address,
  vault: Address
): Promise<IInstruction> {
  const farmClient = new Farms(rpc);
  return farmClient.updateFarmConfigIx(
    farmAdmin,
    farm,
    DEFAULT_PUBLIC_KEY,
    new FarmConfigOption.UpdateVaultId(),
    vault
  );
}

export function getSharesInFarmUserPosition(userState: UserState, tokenDecimals: number): Decimal {
  return lamportsToCollDecimal(new Decimal(scaleDownWads(userState.activeStakeScaled)), tokenDecimals);
}

export type SetupFarmIxsWithFarm = {
  farm: TransactionSigner;
  setupFarmIxs: IInstruction[];
};

export type UnstakeAndWithdrawFromFarmIxs = {
  unstakeIx: IInstruction;
  withdrawIx: IInstruction;
};
