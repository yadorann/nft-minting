import { useCallback, useEffect, useState } from 'react'
import { ethers, Contract, utils, BigNumber, ContractTransaction } from 'ethers'
import { useMoralis, useWeb3ExecuteFunction } from 'react-moralis'
import { useNotification, Icon, Loading, ConnectButton } from 'web3uikit'
import type { TIconType } from 'web3uikit/dist/components/Icon/collection'
import type {
  IPosition,
  notifyType
} from 'web3uikit/dist/components/Notification/types'

import ABI from '../config/abi.json'
import contractConfig from '../config/contract-config.json'
import { getContractAddress, checkChainIdIncluded } from '../utils/chain'
import { getProof, checkAllowlisted } from '../utils/allowlist'
import Countdown from './Countdown'

type CustomErrors = {
  [key: string]: string
}
declare global {
  interface Window {
    ethereum: any
  }
}
export default function Mint() {
  const { maxSupply, saleType, gasToken, customErrors } = contractConfig

  const { isWeb3Enabled, account, chainId: chainIdHex } = useMoralis()
  const proof = getProof(account)
  const isChainIdIncluded = checkChainIdIncluded(chainIdHex)
  console.log(chainIdHex)
  const [saleState, setSaleState] = useState(0)
  const [mintPrice, setMintPrice] = useState(BigNumber.from(0))
  const [maxMintAmountPerTx, setMaxMintAmountPerTx] = useState(0)
  const [totalSupply, setTotalSupply] = useState(0)
  const [mintAmount, setMintAmount] = useState(1)

  const dispatch = useNotification()

  const address = '0xE3E819593300001842AeD39165680E584Cb7AEaB'

  const [queenOfLust, setQueenOfLust] = useState<Contract>()
  useEffect(() => {
    if (!isWeb3Enabled) return
    const provider = new ethers.providers.Web3Provider(window.ethereum as any)
    setQueenOfLust(new ethers.Contract(address, ABI, provider.getSigner(0)))
  }, [isWeb3Enabled])

  // const updateUiValues = useCallback(async () => {
  //   const saleStateFromCall = (await getSaleState()) as number
  //   const mintPriceFromCall = (await getMintPrice()) as BigNumber
  //   const maxMintAmountPerTxFromCall =
  //     (await getMaxMintAmountPerTx()) as BigNumber
  //   const totalSupplyFromCall = (await getTotalSupply()) as BigNumber
  //   setSaleState(saleStateFromCall)
  //   setMintPrice(mintPriceFromCall)
  //   setMaxMintAmountPerTx(5)
  //   // setMaxMintAmountPerTx(maxMintAmountPerTxFromCall.toNumber());
  //   // setTotalSupply(totalSupplyFromCall.toNumber());
  // }, [getMaxMintAmountPerTx, getMintPrice, getSaleState, getTotalSupply])

  useEffect(() => {
    if (isWeb3Enabled && isChainIdIncluded) {
      // updateUiValues()

      // cleanup
      return () => {
        setSaleState(0)
        setMintPrice(BigNumber.from(0))
        setMaxMintAmountPerTx(2)
        setTotalSupply(0)
      }
    }
  }, [isChainIdIncluded, isWeb3Enabled])

  function decrementMintAmount() {
    setMintAmount(Math.max(1, mintAmount - 1))
  }

  function incrementMintAmount() {
    setMintAmount(Math.min(maxMintAmountPerTx, mintAmount + 1))
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
      position: position || 'bottomR'
    })
  }

  async function handleOnSuccess(tx: ContractTransaction) {
    await tx.wait(1)
    // updateUiValues()
    handleNotification(
      'success',
      'Successfully minted!',
      'Transaction Notification',
      'checkmark'
    )
  }

  function handleErrorMessage(error: Error) {
    const errNames = Object.keys(customErrors)
    const filtered = errNames.filter((errName) =>
      error.message.includes(errName)
    )
    return filtered[0] in customErrors
      ? (customErrors as CustomErrors)[filtered[0]]
      : error.message
  }

  function handleOnError(error: Error) {
    handleNotification(
      'error',
      handleErrorMessage(error),
      'Transaction Notification',
      'xCircle'
    )
  }

  async function mint() {
    if (!queenOfLust) return
    const pricelist = [
      '50000000000000000',
      '60000000000000000',
      '74000000000000000'
    ]
    await queenOfLust.mint(mintAmount, 2, {
      value: pricelist[0],
      gasLimit: '30000000'
    })
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
          <div className="flex flex-col md:flex-row md:space-x-14 w-full mt-10 md:mt-14">
            <div className="relative w-full">
              <div className="font-coiny z-10 absolute top-2 left-2 opacity-80 filter backdrop-blur-lg text-base px-4 py-2 bg-black border border-brand-purple rounded-md flex items-center justify-center text-white font-semibold">
                <p>
                  <span className="text-brand-pink">{1}</span> / {maxSupply}
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
                    <p>{Number.parseFloat('0.74').toFixed(2)} ETH</p>{' '}
                    <span className="text-gray-400">+ GAS</span>
                  </div>
                </div>
              </div>
              {queenOfLust ? (
                <button
                  className={`font-coiny mt-12 w-full px-6 py-3 rounded-md text-2xl text-white  mx-4 tracking-wide uppercase`}
                  disabled={!isWeb3Enabled || !isChainIdIncluded}
                  onClick={mint}
                >
                  Mint
                </button>
              ) : (
                <div className="px-6 py-10 mx-4">
                  <ConnectButton moralisAuth={false} />
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-gray-800 flex flex-col items-center mt-10 py-2 w-full">
            <h3 className="font-coiny text-2xl text-brand-pink uppercase mt-6">
              Contract Address
            </h3>
            <a
              href={getEtherscanUrl(chainIdHex, address)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 mt-4"
            >
              <span className="break-all ...">{address}</span>
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
const getEtherscanUrl = (chainIdHex: string | null, address: string) =>
  `https://${
    chainIdHex === '0x4' ? 'rinkeby' : chainIdHex === '0x1' ? 'www' : 'x'
  }.etherscan.io/address/${address}#readContract`
