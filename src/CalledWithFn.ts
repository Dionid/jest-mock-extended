import { CalledWithMock } from './Mock';
import { Matcher, MatchersOrLiterals } from './Matchers';

interface CalledWithStackItem<T, Y extends any[]> {
    args: MatchersOrLiterals<Y>;
    calledWithFn: jest.Mock<T, Y>;
}

const checkCalledWith = <T, Y extends any[]>(fnName: string, calledWithStack: CalledWithStackItem<T, Y>[], actualArgs: Y): T => {
    const calledWithInstance = calledWithStack.find(instance =>
        instance.args.every((matcher, i) =>
            matcher instanceof Matcher ? matcher.asymmetricMatch(actualArgs[i]) : actualArgs[i] === matcher
        )
    );
    if (calledWithInstance) {
        return calledWithInstance.calledWithFn(...actualArgs)
    } else {
        throw new Error(`All "${fnName}" function implementations can't handle args: ${JSON.stringify(actualArgs)}`)
    }
};

export const calledWithFn = <T, Y extends any[]>(fnName: string): CalledWithMock<T, Y> => {
    const fn: jest.Mock<T, Y> = jest.fn();
    const calledWithStack: CalledWithStackItem<T, Y>[] = [];
    let hasImplementation = false;

    (fn as CalledWithMock<T, Y>).calledWith = (...args) => {
        // We create new function to delegate any interactions (mockReturnValue etc.) to for this set of args.
        // If that set of args is matched, we just call that jest.fn() for the result.
        const calledWithFn = jest.fn();
        if (!hasImplementation) {
            // Our original function gets a mock implementation which handles the matching
            fn.mockImplementation((...args: Y) => checkCalledWith(fnName, calledWithStack, args));
        }
        calledWithStack.push({ args, calledWithFn });
        hasImplementation = true;

        return calledWithFn;
    };
    fn.mockImplementation((...args) => {
        throw new Error(`No implementation for "${fnName}" function. Called with args: ${JSON.stringify(args)}`)
    });

    return fn as CalledWithMock<T, Y>;
};

export default calledWithFn;
