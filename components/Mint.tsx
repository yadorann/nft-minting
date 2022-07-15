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
  saleType:
    | 'SALE NOT STARTED'
    | 'OG SALE'
    | 'WHITELIST SALE'
    | 'PUBLIC SALE'
    | 'SALE END!'
  step: number
  amount: number
  price: string
  saleStartTime: number
  saleEndTime: number
}

const sales: SaleType[] = [
  {
    saleType: 'SALE NOT STARTED',
    step: 0,
    amount: 0,
    price: '0',
    saleStartTime: 0,
    saleEndTime: 1657888200
  },
  {
    saleType: 'OG SALE',
    step: 0,
    amount: 700,
    price: '50000000000000000',
    saleStartTime: 1657888200,
    saleEndTime: 1657891800
    // saleStartTime: 1657822980,
    // saleEndTime: 1657826580
  },
  {
    saleType: 'WHITELIST SALE',
    step: 1,
    amount: 2700,
    price: '60000000000000000',
    saleStartTime: 1657891800,
    saleEndTime: 1657895400
    // saleStartTime: 1657822980,
    // saleEndTime: 1657826580
  },
  {
    saleType: 'PUBLIC SALE',
    step: 2,
    amount: 5000,
    price: '74000000000000000',
    // saleStartTime: 1657895400,
    // saleEndTime: 1657899000
    saleStartTime: 1657822980,
    saleEndTime: 1657931400
  },
  {
    saleType: 'SALE END!',
    step: 0,
    amount: 0,
    price: '0',
    saleStartTime: 0,
    saleEndTime: 0
  }
]

const SALE_END_TIME = 1657931400
const getSale = () => {
  const currentTime = Math.floor(new Date().getTime() / 1000)
  if (currentTime > SALE_END_TIME) return sales[4]

  const sale = sales.find(
    (sale) =>
      sale.saleStartTime <= currentTime && sale.saleEndTime > currentTime
  )
  if (!sale) return sales[0]
  return sale
}
//chain id 확인해서 바꾸게 유도 o
//price 랜더 이슈 *
//connect wallet 백그라운드 o
//트젝시 리랜더 o
//트젝시 로딩 o
//페비콘 변경? o
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
    parseInt(getSale().price) / Math.pow(10, 18)
  )
  const [totalPrice, setTotalPrice] = useState(0)
  const [maxMintAmountPerTx, setMaxMintAmountPerTx] = useState(0)

  const [mintAmount, setMintAmount] = useState(0)
  const [totalAmount, setTotalAmount] = useState(getSale().amount)
  const [txHash, setTxHash] = useState<string | undefined>()
  const [remainAmount, setRemainAmount] = useState(0)
  const [remainTime, setRemainTime] = useState('--:--:--')

  const dispatch = useNotification()

  const address = '0xCf818F1453F13d8B1E93a907dB67E0Fb6cd061B3'

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
      else if (currentSale.saleType === 'PUBLIC SALE') setMaxMintAmountPerTx(20)
      else setMaxMintAmountPerTx(0)
      // cleanup
      return () => {
        setMintPrice(0)
        setMaxMintAmountPerTx(2)
      }
    }
  }, [contract, isChainIdIncluded, isWeb3Enabled])

  const mintListAddress = async () => {
    if (!contract) return
    const mintAmount = await contract.mintListAddress(account)
    setMaxMintAmountPerTx(mintAmount)
    setMintAmount(mintAmount)
    setTotalPrice(mintPrice * mintAmount)
    return mintAmount
  }
  const whiteListAddress = async () => {
    if (!contract) return
    const mintAmount = await contract.whiteListAddress(account)
    setMaxMintAmountPerTx(mintAmount)
    setMintAmount(mintAmount)
    setTotalPrice(mintPrice * mintAmount)
    return mintAmount
  }

  function decrementMintAmount() {
    const amount = Math.max(1, mintAmount - 1)
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
    if (!contract || currentSale.saleType === 'SALE NOT STARTED') return
    let tx = null
    tx = await contract.mint(mintAmount, currentSale.step, {
      value: (parseInt(currentSale.price) * mintAmount).toString(),
      gasLimit: '3000000'
    })
    setTxHash(tx)
    const receipt = await tx.wait()
    if (receipt.status === 0) {
      throw new Error('Failed')
    } else {
      setTxHash('')
      if (currentSale.saleType === 'OG SALE') await mintListAddress()
      //Whitelist sale
      else if (currentSale.saleType === 'WHITELIST SALE')
        await whiteListAddress()
      //Public sale
    }
  }

  const networkName = () =>
    chainIdHex === '0x2a'
      ? 'Kovan'
      : chainIdHex === '0x3'
      ? 'Ropsten'
      : chainIdHex === '0x4'
      ? 'Rinkeby'
      : chainIdHex === '0x5'
      ? 'Goerli'
      : 'Unknown'
  useInterval(async () => {
    const sale = getSale()

    const timeStr = new Date(sale.saleEndTime * 1000).toISOString()

    if (sale.saleType !== currentSale.saleType) {
      const price = parseInt(BigInt(parseInt(sale.price)).toString())
      setMintPrice(price / Math.pow(10, 18))
      const mintAmount =
        sale.saleType === 'OG SALE'
          ? await mintListAddress()
          : await whiteListAddress()
      setTotalPrice((price / Math.pow(10, 18)) * mintAmount)
      setTotalAmount(sale.amount)
      setCurrentSale(sale)
    }
    setRemainTime(timer.getRemainTimeStr(timeStr))
  }, 1000)

  useInterval(async () => {
    if (
      !contract ||
      currentSale.saleType === 'SALE NOT STARTED' ||
      currentSale.saleType === 'SALE END!'
    )
      return
    const BN = await contract.getMintableAmount(currentSale.step)
    const mintableAmount = parseInt(BigInt(BN).toString())

    setRemainAmount(mintableAmount)
  }, 15000)

  return (
    <>
      <div className="flex overflow-hidden  items-center justify-center pt-20 w-[90vw] md:h-full md:w-full px-2 md:px-10">
        {chainIdHex && chainIdHex !== '0x1' && (
          <>
            <div className="fixed top-0 left-0 w-screen h-screen z-10 bg-black/80" />
            <div className="absolute flex w-screen justify-center align-middle items-center">
              <div className="relative  break-words rounded-xl pt-5 pb-10 z-20 w-5/6 h-auto md:w-fit md:min-w-[700px] md:h-[600px] md:text-[38px] bg-white text-slate-600 text-center">
                <div className="flex justify-center align-middle items-center h-full">
                  <div>
                    Please change your chain network!
                    <p className="md:text-[38px] my-2">
                      Network :{networkName()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {txHash && (
          <>
            <div className="fixed top-0 left-0 w-screen h-screen z-10 bg-black/80" />
            <div className="absolute flex w-screen justify-center align-middle items-center">
              <div className="relative  break-words rounded-xl pt-5 pb-10 z-20 w-5/6 h-auto md:w-fit md:min-w-[700px] md:h-[600px] md:text-[38px] bg-white text-slate-600 text-center">
                <div className="flex justify-center align-middle items-center h-full">
                  <div>
                    <div className="flex justify-center align-middle mb-5">
                      <svg
                        role="status"
                        className="mr-2 w-[60px] h-[60px] md:w-[60px] md:h-[60px] text-gray-200 animate-spin dark:text-gray-600 fill-red-500"
                        viewBox="0 0 100 101"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                          fill="currentColor"
                        />
                        <path
                          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                          fill="currentFill"
                        />
                      </svg>
                    </div>
                    Waiting for transaction
                    <p className="md:text-[38px] my-2">{txHash}</p>
                    to be mint
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        <div className="relative z-1 md:max-w-3xl w-full bg-gray-900/90 filter backdrop-blur-sm py-4 rounded-md px-2 md:px-10 flex flex-col items-center">
          <h1 className=" uppercase font-bold text-3xl mt-5 md:text-4xl bg-gradient-to-br text-white-500  from-brand-green to-brand-blue bg-clip-text ">
            {currentSale.saleType}
          </h1>
          <div className="md:flex md:flex-row md:space-x-14 space-y-5 w-full mt-10 md:mt-14">
            <div className="relative w-full hidden md:block">
              <div className=" z-10 absolute top-2 left-2 opacity-80 filter backdrop-blur-lg text-base px-4 py-2 bg-black border border-brand-purple rounded-md flex items-center justify-center text-white font-semibold">
                <p>
                  <span className="text-brand-white ">{remainAmount}</span> /{' '}
                  {currentSale.amount}
                </p>
              </div>
              <img
                src="/assets/mib_main.jpg"
                className="object-cover  md:block w-full sm:h-[280px] md:w-[250px] rounded-md"
              />
            </div>
            <div className="relative w-full block md:hidden">
              <div className="z-10 opacity-80  backdrop-blur-lg text-3xl py-2 bg-black border border-brand-purple rounded-md flex items-center justify-center text-white font-semibold">
                <p>
                  <span className="text-brand-white">{remainAmount}</span> /{' '}
                  {currentSale.amount}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center w-full px-4 mt-16 md:mt-0">
              <div className=" flex items-center justify-between w-full">
                <button
                  className="w-14 h-10 md:w-16 md:h-12 flex items-center justify-center text-brand-background hover:shadow-lg bg-gray-300 font-bold rounded-md"
                  disabled={
                    currentSale.saleType === 'SALE NOT STARTED' ||
                    currentSale.saleType === 'SALE END!'
                  }
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

                <p className="flex items-center justify-center flex-1 grow text-center font-bold text-brand-white text-3xl md:text-4xl">
                  {mintAmount}
                </p>

                <button
                  className="w-14 h-10 md:w-16 md:h-12 flex items-center justify-center text-brand-background hover:shadow-lg bg-gray-300 font-bold rounded-md"
                  disabled={
                    currentSale.saleType === 'SALE NOT STARTED' ||
                    currentSale.saleType === 'SALE END!'
                  }
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

              <p className="text-sm text-white-200 tracking-widest mt-3">
                {currentSale.saleType === 'PUBLIC SALE'
                  ? 'Max Mint per Tx'
                  : 'Max Mint Amount'}
                : {maxMintAmountPerTx}
              </p>

              <div className="border-t border-b py-4 md:mt-16 mt-5 w-full">
                <div className="w-full text-xl font-coiny flex items-center justify-between text-brand-yellow">
                  <p>Total</p>

                  <div className="flex items-center space-x-3">
                    {/* <p>{Number.parseFloat(mintPrice).toFixed(3)} ETH</p>{' '} */}
                    {/* {parseInt(BigInt(mintPrice).toString()} */}
                    {totalPrice.toFixed(3)}ETH
                  </div>
                </div>
              </div>
              <h1 className="font-bold text-3xl mt-5">{remainTime}</h1>
            </div>
          </div>
          <div className="border-t md:mb-5 mb-0 border-gray-800 flex flex-col items-center md:mt-5 mt-1 py-2 w-full">
            {contract ? (
              <button
                className={`font-coiny mt-5 ${
                  maxMintAmountPerTx &&
                  currentSale.saleType !== 'SALE NOT STARTED' &&
                  currentSale.saleType !== 'SALE END!'
                    ? 'bg-red-500'
                    : 'bg-gray-500'
                } w-full px-6 py-3 rounded-md text-2xl  ${
                  maxMintAmountPerTx &&
                  currentSale.saleType !== 'SALE NOT STARTED' &&
                  currentSale.saleType !== 'SALE END!'
                    ? 'text-white'
                    : 'text-gray'
                }   mx-4 tracking-wide uppercase`}
                disabled={
                  !mintAmount ||
                  !isWeb3Enabled ||
                  !isChainIdIncluded ||
                  currentSale.saleType === 'SALE NOT STARTED' ||
                  currentSale.saleType === 'SALE END!'
                }
                onClick={mint}
              >
                Mint
              </button>
            ) : (
              <div className="md:mt-10 mt-1">
                <ConnectButton moralisAuth={false} />
              </div>
            )}
            {/* <h3 className=" text-2xl text-brand-white uppercase mt-6">
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
            </a> */}
          </div>
        </div>
      </div>
    </>
  )
}
