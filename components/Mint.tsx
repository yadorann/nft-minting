import { useCallback, useEffect, useState } from "react";
import {
  ethers,
  Contract,
  utils,
  BigNumber,
  ContractTransaction,
} from "ethers";
import { useMoralis, useWeb3ExecuteFunction } from "react-moralis";
import { useNotification, Icon, Loading, ConnectButton } from "web3uikit";
import type { TIconType } from "web3uikit/dist/components/Icon/collection";
import type {
  IPosition,
  notifyType,
} from "web3uikit/dist/components/Notification/types";

import ABI from "../config/abi.json";
import contractConfig from "../config/contract-config.json";
import { getContractAddress, checkChainIdIncluded } from "../utils/chain";
import { getProof, checkAllowlisted } from "../utils/allowlist";
import Countdown from './Countdown';

type CustomErrors = {
  [key: string]: string;
};
declare global {
  interface Window {
    ethereum: any;
  }
}
export default function Mint() {
  const { maxSupply, saleType, gasToken, customErrors } = contractConfig;

  const { isWeb3Enabled, account, chainId: chainIdHex } = useMoralis();

  const proof = getProof(account);
  const isAllowlisted = checkAllowlisted(account);
  const contractAddress = getContractAddress(chainIdHex);
  const isChainIdIncluded = checkChainIdIncluded(chainIdHex);

  const [saleState, setSaleState] = useState(0);
  const [mintPrice, setMintPrice] = useState(BigNumber.from(0));
  const [maxMintAmountPerTx, setMaxMintAmountPerTx] = useState(0);
  const [totalSupply, setTotalSupply] = useState(0);
  const [mintAmount, setMintAmount] = useState(1);

  const dispatch = useNotification();

  const address = "0xE3E819593300001842AeD39165680E584Cb7AEaB";

  // const [provider, setProvider] = useState<any>();
  const [queenOfLust, setQueenOfLust] = useState<Contract>();
  useEffect(() => {
    if (!isWeb3Enabled) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum as any);
    setQueenOfLust(new ethers.Contract(address, ABI, provider.getSigner(0)));
  }, [isWeb3Enabled]);

  // allowlistMint() function
  const {
    fetch: allowlistMint,
    isFetching: isFetchingAM,
    isLoading: isLoadingAM,
  } = useWeb3ExecuteFunction({
    abi: ABI,
    contractAddress: contractAddress,
    functionName: "mint",
    params: {
      _mintAmount: mintAmount,
      _merkleProof: proof,
    },
    msgValue: utils
      .parseEther(saleType.allowlistSale.mintPrice)
      .mul(mintAmount)
      .toString(),
  });

  // publicMint() function
  const {
    fetch: publicMint,
    isFetching: isFetchingPM,
    isLoading: isLoadingPM,
  } = useWeb3ExecuteFunction({
    abi: ABI,
    contractAddress: contractAddress,
    functionName: "publicMint",
    params: {
      _mintAmount: mintAmount,
    },
    msgValue: utils
      .parseEther(saleType.publicSale.mintPrice)
      .mul(mintAmount)
      .toString(),
  });

  const { fetch: getSaleState } = useWeb3ExecuteFunction({
    abi: ABI,
    contractAddress: contractAddress,
    functionName: "getSaleState",
  });

  const { fetch: getMintPrice } = useWeb3ExecuteFunction({
    abi: ABI,
    contractAddress: contractAddress,
    functionName: "getMintPrice",
  });

  const { fetch: getMaxMintAmountPerTx } = useWeb3ExecuteFunction({
    abi: ABI,
    contractAddress: contractAddress,
    functionName: "getMaxMintAmountPerTx",
  });

  const { fetch: getTotalSupply } = useWeb3ExecuteFunction({
    abi: ABI,
    contractAddress: contractAddress,
    functionName: "totalSupply",
  });

  const updateUiValues = useCallback(async () => {
    const saleStateFromCall = (await getSaleState()) as number;
    const mintPriceFromCall = (await getMintPrice()) as BigNumber;
    const maxMintAmountPerTxFromCall =
      (await getMaxMintAmountPerTx()) as BigNumber;
    const totalSupplyFromCall = (await getTotalSupply()) as BigNumber;
    setSaleState(saleStateFromCall);
    setMintPrice(mintPriceFromCall);
    setMaxMintAmountPerTx(5);
    // setMaxMintAmountPerTx(maxMintAmountPerTxFromCall.toNumber());
    // setTotalSupply(totalSupplyFromCall.toNumber());
    
  }, [getMaxMintAmountPerTx, getMintPrice, getSaleState, getTotalSupply]);

  useEffect(() => {
    if (isWeb3Enabled && isChainIdIncluded) {
      updateUiValues();

      // cleanup
      return () => {
        setSaleState(0);
        setMintPrice(BigNumber.from(0));
        setMaxMintAmountPerTx(2);
        setTotalSupply(0);
      };
    }
  }, [isChainIdIncluded, isWeb3Enabled, updateUiValues]);

  function decrementMintAmount() {
    setMintAmount(Math.max(1, mintAmount - 1));
  }

  function incrementMintAmount() {
    setMintAmount(Math.min(maxMintAmountPerTx, mintAmount + 1));
  }

  function handleNotification(
    type: notifyType,
    message?: string,
    title?: string,
    icon?: TIconType,
    position?: IPosition
  ) {
    dispatch({
      type,
      message,
      title,
      icon,
      position: position || "bottomR",
    });
  }

  async function handleOnSuccess(tx: ContractTransaction) {
    await tx.wait(1);
    updateUiValues();
    handleNotification(
      "success",
      "Successfully minted!",
      "Transaction Notification",
      "checkmark"
    );
  }

  function handleErrorMessage(error: Error) {
    const errNames = Object.keys(customErrors);
    const filtered = errNames.filter((errName) =>
      error.message.includes(errName)
    );
    return filtered[0] in customErrors
      ? (customErrors as CustomErrors)[filtered[0]]
      : error.message;
  }

  function handleOnError(error: Error) {
    handleNotification(
      "error",
      handleErrorMessage(error),
      "Transaction Notification",
      "xCircle"
    );
  }

  async function mint() {
    if (!queenOfLust) return;
    // console.log(queenOfLust);
    // const num: BigNumber = await queenOfLust.getMintableAmount(0);
    const pricelist = ["50000000000000000","60000000000000000","74000000000000000"];
    // const wei = Utils.etherToWei(Number(price) * count);
    await queenOfLust.mint(mintAmount, 2, { value: price, gasLimit: "30000000" });

    // console.log((await queenOfLust.getMintableAmount(2)).toString());

    // console.log(num.toNumber());

    // if (saleState === 0) return;
    // if (saleState === 1) {
    //   await allowlistMint({
    //     onSuccess: async (tx) =>
    //       await handleOnSuccess(tx as ContractTransaction),
    //     onError: (error) => handleOnError(error),
    //   });
    // }
    // if (saleState === 2) {
    //   await publicMint({
    //     onSuccess: async (tx) =>
    //       await handleOnSuccess(tx as ContractTransaction),
    //     onError: (error) => handleOnError(error),
    //   });
    // }
    // console.log(queenOfLust.getMintableAmout(0));
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center h-full w-full px-2 md:px-10">
        <div className="relative z-1 md:max-w-3xl w-full bg-gray-900/90 filter backdrop-blur-sm py-4 rounded-md px-2 md:px-10 flex flex-col items-center">
          <Countdown date={`2022-07-15T21:00:00`} />
          <h1 className="font-coiny uppercase font-bold text-3xl md:text-4xl bg-gradient-to-br  from-brand-green to-brand-blue bg-clip-text text-transparent mt-3">
            {/* {paused ? 'Paused' : isPreSale ? 'Pre-Sale' : 'Public Sale'} */}
            Public Sale
          </h1>
          <h3 className="text-sm text-pink-200 tracking-widest">
          0x1c7A1EE39961263282BF534E203bA97Ad1CEeE78
          </h3>
          <div className="flex flex-col md:flex-row md:space-x-14 w-full mt-10 md:mt-14">
              <div className="relative w-full">
                <div className="font-coiny z-10 absolute top-2 left-2 opacity-80 filter backdrop-blur-lg text-base px-4 py-2 bg-black border border-brand-purple rounded-md flex items-center justify-center text-white font-semibold">
                  <p>
                    <span className="text-brand-pink">{1}</span> /{' '}
                    {maxSupply}
                  </p>
                </div>

                <img
                  src="/assets/mib_main.jpg"
                  className="object-cover w-full sm:h-[280px] md:w-[250px] rounded-md"
                />
              </div>

              <div className="flex flex-col items-center w-full px-4 mt-16 md:mt-0">
                <div className="font-coiny flex items-center justify-between w-full">
                  <button
                    className="w-14 h-10 md:w-16 md:h-12 flex items-center justify-center text-brand-background hover:shadow-lg bg-gray-300 font-bold rounded-md"
                    onClick={incrementMintAmount}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 md:h-8 md:w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </button>

                  <p className="flex items-center justify-center flex-1 grow text-center font-bold text-brand-pink text-3xl md:text-4xl">
                    {mintAmount}
                  </p>

                  <button
                    className="w-14 h-10 md:w-16 md:h-12 flex items-center justify-center text-brand-background hover:shadow-lg bg-gray-300 font-bold rounded-md"
                    onClick={decrementMintAmount}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 md:h-8 md:w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18 12H6"
                      />
                    </svg>
                  </button>
                </div>

                <p className="text-sm text-pink-200 tracking-widest mt-3">
                  Max Mint Amount: {2}
                </p>

                <div className="border-t border-b py-4 mt-16 w-full">
                  <div className="w-full text-xl font-coiny flex items-center justify-between text-brand-yellow">
                    <p>Total</p>

                    <div className="flex items-center space-x-3">
                      <p>
                        {Number.parseFloat('0.74').toFixed(
                          2
                        )}{' '}
                        ETH
                      </p>{' '}
                      <span className="text-gray-400">+ GAS</span>
                    </div>
                  </div>
                </div>

                {/* Mint Button && Connect Wallet Button */}

                {queenOfLust ? (
                  <button
                    className={`font-coiny mt-12 w-full px-6 py-3 rounded-md text-2xl text-white  mx-4 tracking-wide uppercase`}
                    disabled={!isWeb3Enabled || !isChainIdIncluded}
                    onClick={mint}
                  >
                    Mint
                  </button>
                ) : (
                  // <button
                  //   className="font-coiny mt-12 w-full bg-gradient-to-br from-brand-purple to-brand-pink shadow-lg px-6 py-3 rounded-md text-2xl text-white hover:shadow-pink-400/50 mx-4 tracking-wide uppercase"
                  //   onClick={() => mint()}
                  // >
                  //   Connect Wallet
                  // </button>
                  <ConnectButton moralisAuth={false} />
                )}

              </div>
            </div>
                <div className="border-t border-gray-800 flex flex-col items-center mt-10 py-2 w-full">
                  <h3 className="font-coiny text-2xl text-brand-pink uppercase mt-6">
                    Contract Address
                  </h3>
                  <a
                    href={`https://rinkeby.etherscan.io/address/${'1111'}#readContract`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 mt-4"
                  >
                    <span className="break-all ...">{'0x1c7A1EE39961263282BF534E203bA97Ad1CEeE78'}</span>
                  </a>
                </div>
        </div>
      </div>

      {/* <div className="border border-t-red-300 border-r-blue-300 border-b-green-300 border-l-yellow-300 rounded p-8">
        <div className="flex justify-around border-b border-gray-700 pb-8">
          <div className="space-y-1">
            <div className="text-gray-400 text-center">Supply</div>
            <div className="text-lg sm:text-2xl">
              <span className="text-pink-500">{totalSupply}</span> / {maxSupply}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-gray-400">Sale:</div>
            <div className="text-lg sm:text-2xl">
              {saleState === 0 && "Closed"}
              {saleState === 1 && "Allowlist Only"}
              {saleState === 2 && "Public Open"}
            </div>
          </div>
        </div>

        {saleState === 0 || (saleState === 1 && !isAllowlisted) ? (
          <div className="mt-8">
            <Icon fill="#fff" size={64} svg="lockClosed" />
          </div>
        ) : (
          <div className="pt-8 space-y-4">
            <div className="flex justify-center items-center space-x-8">
              <button
                type="button"
                className={`rounded-full p-2 ${
                  mintAmount <= 1 ? "bg-gray-800 cursor-default" : "bg-gray-600"
                }`}
                onClick={decrementMintAmount}
              >
                <Icon fill="#fff" svg="minus" />
              </button>

              <span className="text-xl">{mintAmount}</span>

              <button
                type="button"
                className={`rounded-full p-2 ${
                  mintAmount >= maxMintAmountPerTx
                    ? "bg-gray-800 cursor-default"
                    : "bg-gray-600"
                }`}
                onClick={incrementMintAmount}
              >
                <Icon fill="#fff" svg="plus" />
              </button>
            </div>

            <div className="text-center text-lg">
              <span className="text-gray-400">Total Price:</span>{" "}
              {mintPrice} {gasToken}
              {console.log(mintPrice)}
              {utils.formatEther(mintPrice.mul(mintAmount))} {gasToken}
              {gasToken}
            </div>

            <div>
              {isFetchingAM || isLoadingAM || isFetchingPM || isLoadingPM ? (
                <button
                  type="button"
                  className="flex justify-center rounded px-4 py-2 w-full bg-blue-800 cursor-not-allowed"
                  disabled
                >
                  <Loading size={24} spinnerColor="#fff" />
                </button>
              ) : (
                <button
                  type="button"
                  className={`rounded px-4 py-2 font-bold w-full ${
                    !isWeb3Enabled || !isChainIdIncluded
                      ? "bg-gray-700 cursor-not-allowed"
                      : "bg-blue-700 hover:bg-blue-600"
                  }`}
                  disabled={!isWeb3Enabled || !isChainIdIncluded}
                  onClick={mint}
                >
                  Mint
                </button>
              )}
            </div>
          </div>
        )}
        {!isWeb3Enabled && (
          <div className="text-red-500 text-center mt-4">
            Not connected to your wallet!
          </div>
          <ConnectButton moralisAuth={false} />
        )}
        {isWeb3Enabled && !isChainIdIncluded && (
          <div className="text-red-500 text-center mt-4">
            Switch to {process.env.NEXT_PUBLIC_NETWORK_NAME}
          </div>
        )}
        {isWeb3Enabled && isChainIdIncluded && saleState === 0 && (
          <div className="text-red-500 text-center mt-4">
            Sales are closed now.
          </div>
        )}
        {isWeb3Enabled &&
          isChainIdIncluded &&
          saleState === 1 &&
          !isAllowlisted && (
            <div className="text-red-500 text-center mt-4">
              Address is not allowlisted.
            </div>
          )}
      </div> */}
    </>
  );
}
