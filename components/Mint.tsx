import { useCallback, useEffect, useState } from 'react'
import { ethers, Contract, utils, BigNumber, ContractTransaction } from 'ethers'
import { useMoralis, useWeb3ExecuteFunction } from 'react-moralis'
import { useNotification, Icon, Loading, ConnectButton } from 'web3uikit'
import type { TIconType } from 'web3uikit/dist/components/Icon/collection'
import type {
  IPosition,
  notifyType
} from 'web3uikit/dist/components/Notification/types'
import { useInterval } from './../hook'
import ABI from '../config/abi.json'
import contractConfig from '../config/contract-config.json'
import { getContractAddress, checkChainIdIncluded } from '../utils/chain'
import { getProof, checkAllowlisted } from '../utils/allowlist'
import * as timer from '../utils/timer'

type CustomErrors = {
  [key: string]: string
}
declare global {
  interface Window {
    ethereum: any
  }
}

type SaleType = {
  saleType: 'OG SALE' | 'WHITELIST SALE' | 'PUBLIC SALE'
  step: number
  amount: number
  price: string
  saleStartTime: number
  saleEndTime: number
}

const sales: SaleType[] = [
  {
    saleType: 'OG SALE',
    step: 0,
    amount: 700,
    price: '50000000000000000',
    saleStartTime: 1657888200,
    saleEndTime: 1657891769
  },
  {
    saleType: 'WHITELIST SALE',
    step: 1,
    amount: 2000,
    price: '60000000000000000',
    saleStartTime: 1657891800,
    saleEndTime: 1657895369
  },
  {
    saleType: 'PUBLIC SALE',
    step: 2,
    amount: 2300,
    price: '74000000000000000',
    saleStartTime: 1657895400,
    saleEndTime: 1657899000
  }
]

const getSale = () => {
  const currentTime = new Date().getTime()

  const sale = sales.find(
    (sale) =>
      sale.saleStartTime <= currentTime && sale.saleEndTime > currentTime
  )
  if (!sale) return sales[0]
  return sale
}

export default function Mint() {
  const { maxSupply, saleType, gasToken, customErrors } = contractConfig

  const { isWeb3Enabled, account, chainId: chainIdHex } = useMoralis()

  const proof = getProof(account)
  const isAllowlisted = checkAllowlisted(account)
  const contractAddress = getContractAddress(chainIdHex)
  const isChainIdIncluded = checkChainIdIncluded(chainIdHex)
  const [currentSale, setCurrentSale] = useState<SaleType>(getSale())
  const [saleState, setSaleState] = useState(getSale().saleType)
  const [mintPrice, setMintPrice] = useState(
    (parseInt(getSale().price) / 10) ^ 18
  )
  const [totalPrice, setTotalPrice] = useState(0)
  const [maxMintAmountPerTx, setMaxMintAmountPerTx] = useState(0)
  const [totalSupply, setTotalSupply] = useState(0)
  const [mintAmount, setMintAmount] = useState(0)
  const [totalAmount, setTotalAmount] = useState(getSale().amount)
  const [remainTime, setRemainTime] = useState('--:--:--')

  const dispatch = useNotification()

  const address = '0xE3E819593300001842AeD39165680E584Cb7AEaB'

  const [contract, setContract] = useState<Contract>()

  useEffect(() => {
    if (!isWeb3Enabled) return
    const provider = new ethers.providers.Web3Provider(window.ethereum as any)
    setContract(new ethers.Contract(address, ABI, provider.getSigner(0)))
  }, [isWeb3Enabled])

  useEffect(() => {
    if (contract && isWeb3Enabled && isChainIdIncluded) {
      //OG sale
      if (currentSale.saleType === 'OG SALE') mintListAddress()
      //Whitelist sale
      else if (currentSale.saleType === 'WHITELIST SALE') whiteListAddress()
      //Public sale
      else setMintAmount(20)
      // cleanup
      return () => {
        setMintPrice(0)
        setMaxMintAmountPerTx(2)
        setTotalSupply(0)
      }
    }
  }, [contract, isChainIdIncluded, isWeb3Enabled])

  const mintListAddress = async () => {
    if (!contract) return
    const mintAmount = await contract.mintListAddress(account)
    setMintAmount(mintAmount)
  }
  const whiteListAddress = async () => {
    if (!contract) return
    const mintAmount = await contract.whiteListAddress(account)
    setMintAmount(mintAmount)
  }

  function decrementMintAmount() {
    const amount = Math.max(0, mintAmount - 1)
    setMintAmount(amount)
    setTotalPrice(mintPrice * amount)
  }

  function incrementMintAmount() {
    const amount = Math.min(maxMintAmountPerTx, mintAmount + 1)
    setMintAmount(amount)
    setTotalPrice(mintPrice * amount)
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

  const mint = async () => {
    if (!contract) return
    let tx = null
    tx = await contract.mint(mintAmount, currentSale.step, {
      value: parseInt(currentSale.price) * mintAmount,
      gasLimit: '30000000'
    })

    const receipt = await tx.wait()
    if (receipt.status === 0) {
      throw new Error('Failed')
    }
  }

  useInterval(() => {
    const currentSale = getSale()
    const timeStr = new Date(currentSale.saleStartTime * 1000).toISOString()
    const price = parseInt(BigInt(parseInt(getSale().price)).toString())

    setRemainTime(timer.getRemainTimeStr(timeStr))
    setMintPrice(price / Math.pow(10, 18))
    setCurrentSale(currentSale)
    setTotalAmount(currentSale.amount)
  }, 1000)

  return (
    <>
      <div className="flex flex-col items-center justify-center h-full w-full px-2 md:px-10">
        <div className="relative z-1 md:max-w-3xl w-full bg-gray-900/90 filter backdrop-blur-sm py-4 rounded-md px-2 md:px-10 flex flex-col items-center">
          <h1 className="font-coiny uppercase font-bold text-3xl md:text-4xl bg-gradient-to-br  from-brand-green to-brand-blue bg-clip-text text-transparent mt-3">
            {saleState}
          </h1>
          <div className="flex flex-col md:flex-row md:space-x-14 w-full mt-10 md:mt-14">
            <div className="relative w-full">
              <div className="font-coiny z-10 absolute top-2 left-2 opacity-80 filter backdrop-blur-lg text-base px-4 py-2 bg-black border border-brand-purple rounded-md flex items-center justify-center text-white font-semibold">
                <p>
                  <span className="text-brand-pink">{0 - totalAmount}</span> /{' '}
                  {totalAmount}
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

                <p className="flex items-center justify-center flex-1 grow text-center font-bold text-brand-pink text-3xl md:text-4xl">
                  {mintAmount}
                </p>

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
              </div>

              <p className="text-sm text-pink-200 tracking-widest mt-3">
                Max Mint Amount: {mintAmount}
              </p>

              <div className="border-t border-b py-4 mt-16 w-full">
                <div className="w-full text-xl font-coiny flex items-center justify-between text-brand-yellow">
                  <p>Total</p>

                  <div className="flex items-center space-x-3">
                    {/* <p>{Number.parseFloat(mintPrice).toFixed(3)} ETH</p>{' '} */}
                    {/* {parseInt(BigInt(mintPrice).toString()} */}
                    {totalPrice}ETH
                  </div>
                </div>
              </div>
              <h1 className="font-bold text-3xl mt-5">{remainTime}</h1>
            </div>
          </div>
          <div className="border-t border-gray-800 flex flex-col items-center mt-5 py-2 w-full">
            {contract ? (
              <button
                className={`font-coiny mt-5 ${
                  mintAmount ? 'bg-pink-500' : 'bg-gray-500'
                } w-full px-6 py-3 rounded-md text-2xl  ${
                  mintAmount ? 'text-white' : 'text-gray'
                }   mx-4 tracking-wide uppercase`}
                disabled={!mintAmount || !isWeb3Enabled || !isChainIdIncluded}
                onClick={mint}
              >
                Mint
              </button>
            ) : (
              <div className="mt-10">
                <ConnectButton moralisAuth={false} />
              </div>
            )}
            <h3 className="font-coiny text-2xl text-brand-pink uppercase mt-6">
              Contract Address
            </h3>
            <a
              href={`https://rinkeby.etherscan.io/address/${'1111'}#readContract`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 mt-4"
            >
              <span className="break-all ...">
                {'0x1c7A1EE39961263282BF534E203bA97Ad1CEeE78'}
              </span>
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
